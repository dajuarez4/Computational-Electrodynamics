#include <AMReX.H>
#include <AMReX_BoxArray.H>
#include <AMReX_DistributionMapping.H>
#include <AMReX_FFT_Poisson.H>
#include <AMReX_FArrayBox.H>
#include <AMReX_Geometry.H>
#include <AMReX_Gpu.H>
#include <AMReX_GpuLaunch.H>
#include <AMReX_MFIter.H>
#include <AMReX_MultiFab.H>
#include <AMReX_ParmParse.H>
#include <AMReX_PlotFileUtil.H>
#include <AMReX_Print.H>

#include <array>
#include <cmath>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

constexpr double kPi = 3.14159265358979323846;

struct Config {
    int n_cell = 64;
    int max_grid_size = 64;
    amrex::Array<amrex::Real, AMREX_SPACEDIM> lengths{AMREX_D_DECL(1.0, 1.0, 1.0)};
    amrex::Real eps0 = 1.0;
    std::string plotfile = "plt_amrex_fft_poisson_benchmark";
    std::string compare_dir = "amrex_compare/fft_poisson_benchmark_amrex";
};

Config read_config() {
    Config config;

    amrex::ParmParse pp("benchmark");
    pp.query("n_cell", config.n_cell);
    pp.query("max_grid_size", config.max_grid_size);
    pp.query("eps0", config.eps0);
    pp.query("plotfile", config.plotfile);
    pp.query("compare_dir", config.compare_dir);

    amrex::Vector<amrex::Real> lengths(AMREX_SPACEDIM);
    if (pp.queryarr("lengths", lengths, 0, AMREX_SPACEDIM)) {
        for (int idim = 0; idim < AMREX_SPACEDIM; ++idim) {
            config.lengths[idim] = lengths[idim];
        }
    }

    if (config.n_cell <= 0) {
        throw std::runtime_error("benchmark.n_cell must be positive");
    }
    if (config.max_grid_size <= 0) {
        throw std::runtime_error("benchmark.max_grid_size must be positive");
    }
    if (config.eps0 <= 0.0) {
        throw std::runtime_error("benchmark.eps0 must be positive");
    }
    for (int idim = 0; idim < AMREX_SPACEDIM; ++idim) {
        if (config.lengths[idim] <= 0.0) {
            throw std::runtime_error("benchmark.lengths must be positive in every dimension");
        }
    }

    return config;
}

amrex::Real rho_prefactor(const Config& config) {
    return std::pow(2.0 * kPi / config.lengths[0], 2) +
           std::pow(2.0 * kPi / config.lengths[1], 2) +
           std::pow(2.0 * kPi / config.lengths[2], 2);
}

std::string npy_header(const std::array<std::size_t, 3>& shape) {
    std::string dict =
        "{'descr': '<f8', 'fortran_order': False, 'shape': (" +
        std::to_string(shape[0]) + ", " +
        std::to_string(shape[1]) + ", " +
        std::to_string(shape[2]) + "), }";

    std::string header = dict;
    header.push_back('\n');

    const std::size_t preamble = 10;
    const std::size_t total = preamble + header.size();
    const std::size_t padding = (16 - (total % 16)) % 16;
    header.insert(header.end() - 1, padding, ' ');
    return header;
}

std::string npy_header_1d(std::size_t n) {
    std::string dict =
        "{'descr': '<f8', 'fortran_order': False, 'shape': (" +
        std::to_string(n) + ",), }";

    std::string header = dict;
    header.push_back('\n');

    const std::size_t preamble = 10;
    const std::size_t total = preamble + header.size();
    const std::size_t padding = (16 - (total % 16)) % 16;
    header.insert(header.end() - 1, padding, ' ');
    return header;
}

void write_npy_3d(
    const std::filesystem::path& path,
    const std::vector<double>& values,
    const std::array<std::size_t, 3>& shape
) {
    std::ofstream out(path, std::ios::binary);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    const std::string header = npy_header(shape);
    const std::uint16_t header_len = static_cast<std::uint16_t>(header.size());

    out.write("\x93NUMPY", 6);
    out.put(static_cast<char>(1));
    out.put(static_cast<char>(0));
    out.write(reinterpret_cast<const char*>(&header_len), sizeof(header_len));
    out.write(header.data(), static_cast<std::streamsize>(header.size()));
    out.write(reinterpret_cast<const char*>(values.data()),
              static_cast<std::streamsize>(values.size() * sizeof(double)));
}

void write_npy_1d(const std::filesystem::path& path, const std::vector<double>& values) {
    std::ofstream out(path, std::ios::binary);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    const std::string header = npy_header_1d(values.size());
    const std::uint16_t header_len = static_cast<std::uint16_t>(header.size());

    out.write("\x93NUMPY", 6);
    out.put(static_cast<char>(1));
    out.put(static_cast<char>(0));
    out.write(reinterpret_cast<const char*>(&header_len), sizeof(header_len));
    out.write(header.data(), static_cast<std::streamsize>(header.size()));
    out.write(reinterpret_cast<const char*>(values.data()),
              static_cast<std::streamsize>(values.size() * sizeof(double)));
}

std::vector<double> flatten_mf(const amrex::MultiFab& mf, const amrex::Box& domain) {
    if (mf.local_size() != 1) {
        throw std::runtime_error(
            "This first-pass exporter expects a single local box. "
            "Use benchmark.max_grid_size = benchmark.n_cell and run in serial."
        );
    }

    const int nx = domain.length(0);
    const int ny = domain.length(1);
    const int nz = domain.length(2);

    std::vector<double> values(static_cast<std::size_t>(nx) * ny * nz, 0.0);

    const amrex::FArrayBox& fab = mf[0];
    auto const arr = fab.const_array();

    for (int i = domain.smallEnd(0); i <= domain.bigEnd(0); ++i) {
        for (int j = domain.smallEnd(1); j <= domain.bigEnd(1); ++j) {
            for (int k = domain.smallEnd(2); k <= domain.bigEnd(2); ++k) {
                const std::size_t ii = static_cast<std::size_t>(i - domain.smallEnd(0));
                const std::size_t jj = static_cast<std::size_t>(j - domain.smallEnd(1));
                const std::size_t kk = static_cast<std::size_t>(k - domain.smallEnd(2));
                values[(ii * ny + jj) * nz + kk] = arr(i, j, k);
            }
        }
    }

    return values;
}

std::vector<double> cell_center_coordinates(int n_cell, amrex::Real length) {
    const amrex::Real dx = length / static_cast<amrex::Real>(n_cell);
    std::vector<double> values(static_cast<std::size_t>(n_cell), 0.0);
    for (int i = 0; i < n_cell; ++i) {
        values[static_cast<std::size_t>(i)] = static_cast<double>((i + 0.5) * dx);
    }
    return values;
}

}  // namespace

int main(int argc, char* argv[]) {
    amrex::Initialize(argc, argv);

    try {
        const Config config = read_config();

        const amrex::IntVect dom_lo(AMREX_D_DECL(0, 0, 0));
        const amrex::IntVect dom_hi(AMREX_D_DECL(config.n_cell - 1, config.n_cell - 1, config.n_cell - 1));
        const amrex::Box domain(dom_lo, dom_hi);

        amrex::RealBox real_box(
            {AMREX_D_DECL(0.0, 0.0, 0.0)},
            {AMREX_D_DECL(config.lengths[0], config.lengths[1], config.lengths[2])}
        );
        std::array<int, AMREX_SPACEDIM> periodicity{AMREX_D_DECL(1, 1, 1)};
        const amrex::Geometry geom(domain, &real_box, amrex::CoordSys::cartesian, periodicity.data());

        amrex::BoxArray ba(domain);
        ba.maxSize(config.max_grid_size);
        amrex::DistributionMapping dm(ba);

        amrex::MultiFab rho(ba, dm, 1, 0);
        amrex::MultiFab rhs(ba, dm, 1, 0);
        amrex::MultiFab phi(ba, dm, 1, 0);
        amrex::MultiFab phi_exact(ba, dm, 1, 0);
        amrex::MultiFab error(ba, dm, 1, 0);

        const amrex::GpuArray<amrex::Real, AMREX_SPACEDIM> dx = geom.CellSizeArray();
        const amrex::GpuArray<amrex::Real, AMREX_SPACEDIM> plo = geom.ProbLoArray();
        const amrex::Real prefactor = rho_prefactor(config);

        for (amrex::MFIter mfi(rho, amrex::TilingIfNotGPU()); mfi.isValid(); ++mfi) {
            const amrex::Box& bx = mfi.tilebox();
            auto const rho_arr = rho.array(mfi);
            auto const rhs_arr = rhs.array(mfi);
            auto const exact_arr = phi_exact.array(mfi);

            amrex::ParallelFor(
                bx,
                [=] AMREX_GPU_DEVICE(int i, int j, int k) noexcept {
                    const amrex::Real x =
                        plo[0] + (static_cast<amrex::Real>(i) + amrex::Real(0.5)) * dx[0];
                    const amrex::Real y =
                        plo[1] + (static_cast<amrex::Real>(j) + amrex::Real(0.5)) * dx[1];
                    const amrex::Real z =
                        plo[2] + (static_cast<amrex::Real>(k) + amrex::Real(0.5)) * dx[2];

                    const amrex::Real exact =
                        std::cos(2.0 * kPi * x / config.lengths[0]) *
                        std::cos(2.0 * kPi * y / config.lengths[1]) *
                        std::cos(2.0 * kPi * z / config.lengths[2]);

                    const amrex::Real rho_value = config.eps0 * prefactor * exact;
                    exact_arr(i, j, k) = exact;
                    rho_arr(i, j, k) = rho_value;
                    rhs_arr(i, j, k) = -rho_value / config.eps0;
                }
            );
        }
        amrex::Gpu::streamSynchronize();

        const amrex::Real rhs_mean = rhs.sum(0) / geom.Domain().d_numPts();
        rhs.plus(-rhs_mean, 0, 1);

        amrex::FFT::Poisson<amrex::MultiFab> fft_poisson(geom);
        fft_poisson.solve(phi, rhs);

        amrex::MultiFab::Copy(error, phi, 0, 0, 1, 0);
        amrex::MultiFab::Subtract(error, phi_exact, 0, 0, 1, 0);
        amrex::Gpu::streamSynchronize();

        amrex::MultiFab plot_data(ba, dm, 4, 0);
        amrex::MultiFab::Copy(plot_data, phi, 0, 0, 1, 0);
        amrex::MultiFab::Copy(plot_data, rho, 0, 1, 1, 0);
        amrex::MultiFab::Copy(plot_data, phi_exact, 0, 2, 1, 0);
        amrex::MultiFab::Copy(plot_data, error, 0, 3, 1, 0);

        amrex::WriteSingleLevelPlotfile(
            config.plotfile,
            plot_data,
            {"phi", "rho", "phi_exact", "error"},
            geom,
            0.0,
            0
        );

        const std::filesystem::path compare_dir(config.compare_dir);
        std::filesystem::create_directories(compare_dir);

        const std::array<std::size_t, 3> shape{
            static_cast<std::size_t>(config.n_cell),
            static_cast<std::size_t>(config.n_cell),
            static_cast<std::size_t>(config.n_cell)
        };

        write_npy_3d(compare_dir / "phi.npy", flatten_mf(phi, domain), shape);
        write_npy_3d(compare_dir / "rho.npy", flatten_mf(rho, domain), shape);
        write_npy_3d(compare_dir / "phi_exact.npy", flatten_mf(phi_exact, domain), shape);
        write_npy_3d(compare_dir / "error.npy", flatten_mf(error, domain), shape);
        write_npy_1d(compare_dir / "x.npy", cell_center_coordinates(config.n_cell, config.lengths[0]));
        write_npy_1d(compare_dir / "y.npy", cell_center_coordinates(config.n_cell, config.lengths[1]));
        write_npy_1d(compare_dir / "z.npy", cell_center_coordinates(config.n_cell, config.lengths[2]));

        {
            std::ofstream out(compare_dir / "label.txt");
            out << "AMReX FFT::Poisson";
        }

        amrex::Print()
            << "Wrote plotfile: " << config.plotfile << "\n"
            << "Wrote compare arrays: " << compare_dir.string() << "\n";
    } catch (const std::exception& error) {
        amrex::AllPrint() << "Error: " << error.what() << "\n";
        amrex::Finalize();
        return 1;
    }

    amrex::Finalize();
    return 0;
}
