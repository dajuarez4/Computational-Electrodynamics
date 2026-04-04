#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

struct Config {
    int nx = 200;
    int ny = 200;
    double dx = 1.0e-3;
    double dy = 1.0e-3;
    int nsteps = 500;
    int save_every = 5;
    bool write_vtk_frames = true;
    std::string output_dir = "output";
};

void print_usage(const char* program) {
    std::cout
        << "Usage: " << program << " [options]\n"
        << "Options:\n"
        << "  --nsteps <int>       Number of time steps (default: 500)\n"
        << "  --save-every <int>   Save VTK frame every N steps (default: 5)\n"
        << "  --output <path>      Output directory (default: output)\n"
        << "  --vtk <0|1>          Write VTK snapshots (default: 1)\n"
        << "  --help               Show this message\n";
}

Config parse_args(int argc, char* argv[]) {
    Config config;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        if (arg == "--help") {
            print_usage(argv[0]);
            std::exit(0);
        }
        if (i + 1 >= argc) {
            throw std::runtime_error("Missing value for option: " + arg);
        }

        const std::string value = argv[++i];
        if (arg == "--nsteps") {
            config.nsteps = std::stoi(value);
        } else if (arg == "--save-every") {
            config.save_every = std::stoi(value);
        } else if (arg == "--output") {
            config.output_dir = value;
        } else if (arg == "--vtk") {
            config.write_vtk_frames = (std::stoi(value) != 0);
        } else {
            throw std::runtime_error("Unknown option: " + arg);
        }
    }

    if (config.nsteps <= 0) {
        throw std::runtime_error("--nsteps must be positive");
    }
    if (config.save_every <= 0) {
        throw std::runtime_error("--save-every must be positive");
    }
    return config;
}

void write_csv_matrix(
    const std::filesystem::path& path,
    const std::vector<double>& data,
    int nx,
    int ny
) {
    std::ofstream out(path);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    out << std::setprecision(16);
    for (int i = 0; i < nx; ++i) {
        for (int j = 0; j < ny; ++j) {
            if (j != 0) {
                out << ',';
            }
            out << data[static_cast<std::size_t>(i) * ny + j];
        }
        out << '\n';
    }
}

void write_vtk_scalar_field(
    const std::filesystem::path& path,
    const std::vector<double>& data,
    int nx,
    int ny,
    double dx,
    double dy,
    const std::string& field_name
) {
    std::ofstream out(path);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    out << "# vtk DataFile Version 3.0\n";
    out << field_name << "\n";
    out << "ASCII\n";
    out << "DATASET STRUCTURED_POINTS\n";
    out << "DIMENSIONS " << nx << ' ' << ny << " 1\n";
    out << "ORIGIN 0 0 0\n";
    out << "SPACING " << dx << ' ' << dy << " 1\n";
    out << "POINT_DATA " << static_cast<long long>(nx) * ny << '\n';
    out << "SCALARS " << field_name << " double 1\n";
    out << "LOOKUP_TABLE default\n";
    out << std::setprecision(16);

    for (int j = 0; j < ny; ++j) {
        for (int i = 0; i < nx; ++i) {
            out << data[static_cast<std::size_t>(i) * ny + j] << '\n';
        }
    }
}

}  // namespace

int main(int argc, char* argv[]) {
    try {
        const Config config = parse_args(argc, argv);

        constexpr double pi = 3.14159265358979323846;
        constexpr double c0 = 299792458.0;
        constexpr double mu0 = 4.0e-7 * pi;
        constexpr double eps0 = 1.0 / (mu0 * c0 * c0);

        const double dt_cfl = 1.0 / (c0 * std::sqrt((1.0 / (config.dx * config.dx)) + (1.0 / (config.dy * config.dy))));
        const double dt = 0.99 * dt_cfl;

        const int cx = config.nx / 2;
        const int cy = config.ny / 2;
        const int radius = 25;
        const int src_i = config.nx / 4;
        const int src_j = config.ny / 2;
        const int t0 = 40;
        const int spread = 12;

        const auto ez_index = [ny = config.ny](int i, int j) -> std::size_t {
            return static_cast<std::size_t>(i) * ny + j;
        };
        const auto hx_index = [ny = config.ny - 1](int i, int j) -> std::size_t {
            return static_cast<std::size_t>(i) * ny + j;
        };
        const auto hy_index = [ny = config.ny](int i, int j) -> std::size_t {
            return static_cast<std::size_t>(i) * ny + j;
        };

        std::vector<double> eps_r(static_cast<std::size_t>(config.nx) * config.ny, 1.0);
        std::vector<double> eps(static_cast<std::size_t>(config.nx) * config.ny, eps0);
        std::vector<double> ez(static_cast<std::size_t>(config.nx) * config.ny, 0.0);
        std::vector<double> hx(static_cast<std::size_t>(config.nx) * (config.ny - 1), 0.0);
        std::vector<double> hy(static_cast<std::size_t>(config.nx - 1) * config.ny, 0.0);
        std::vector<double> source_history(static_cast<std::size_t>(config.nsteps), 0.0);

        for (int i = 0; i < config.nx; ++i) {
            for (int j = 0; j < config.ny; ++j) {
                if ((i - cx) * (i - cx) + (j - cy) * (j - cy) < radius * radius) {
                    eps_r[ez_index(i, j)] = 4.0;
                }
                eps[ez_index(i, j)] = eps0 * eps_r[ez_index(i, j)];
            }
        }

        const std::filesystem::path output_dir(config.output_dir);
        std::filesystem::create_directories(output_dir);
        if (config.write_vtk_frames) {
            std::filesystem::create_directories(output_dir / "vtk");
        }

        auto gaussian_pulse = [center = static_cast<double>(t0), width = static_cast<double>(spread)](int n) -> double {
            const double scaled = (static_cast<double>(n) - center) / width;
            return std::exp(-0.5 * scaled * scaled);
        };

        for (int n = 0; n < config.nsteps; ++n) {
            for (int i = 0; i < config.nx; ++i) {
                for (int j = 0; j < config.ny - 1; ++j) {
                    hx[hx_index(i, j)] -= (dt / mu0) *
                        (ez[ez_index(i, j + 1)] - ez[ez_index(i, j)]) / config.dy;
                }
            }

            for (int i = 0; i < config.nx - 1; ++i) {
                for (int j = 0; j < config.ny; ++j) {
                    hy[hy_index(i, j)] += (dt / mu0) *
                        (ez[ez_index(i + 1, j)] - ez[ez_index(i, j)]) / config.dx;
                }
            }

            for (int i = 1; i < config.nx - 1; ++i) {
                for (int j = 1; j < config.ny - 1; ++j) {
                    const double curl_h =
                        (hy[hy_index(i, j)] - hy[hy_index(i - 1, j)]) / config.dx -
                        (hx[hx_index(i, j)] - hx[hx_index(i, j - 1)]) / config.dy;
                    ez[ez_index(i, j)] += (dt / eps[ez_index(i, j)]) * curl_h;
                }
            }

            const double source_value = gaussian_pulse(n);
            source_history[static_cast<std::size_t>(n)] = source_value;
            ez[ez_index(src_i, src_j)] += source_value;

            for (int i = 0; i < config.nx; ++i) {
                ez[ez_index(i, 0)] = 0.0;
                ez[ez_index(i, config.ny - 1)] = 0.0;
            }
            for (int j = 0; j < config.ny; ++j) {
                ez[ez_index(0, j)] = 0.0;
                ez[ez_index(config.nx - 1, j)] = 0.0;
            }

            if (config.write_vtk_frames && (n % config.save_every == 0)) {
                std::ostringstream name;
                name << "frame_" << std::setw(4) << std::setfill('0') << n << ".vtk";
                write_vtk_scalar_field(
                    output_dir / "vtk" / name.str(),
                    ez,
                    config.nx,
                    config.ny,
                    config.dx,
                    config.dy,
                    "Ez"
                );
            }
        }

        const auto [min_it, max_it] = std::minmax_element(ez.begin(), ez.end());
        const double max_abs = std::max(std::abs(*min_it), std::abs(*max_it));

        write_csv_matrix(output_dir / "Ez_final.csv", ez, config.nx, config.ny);
        write_csv_matrix(output_dir / "eps_r.csv", eps_r, config.nx, config.ny);
        write_vtk_scalar_field(output_dir / "Ez_final.vtk", ez, config.nx, config.ny, config.dx, config.dy, "Ez");
        write_vtk_scalar_field(output_dir / "eps_r.vtk", eps_r, config.nx, config.ny, config.dx, config.dy, "eps_r");

        {
            std::ofstream out(output_dir / "source_history.csv");
            if (!out) {
                throw std::runtime_error("Failed to open source_history.csv");
            }
            out << "step,source\n";
            out << std::setprecision(16);
            for (int n = 0; n < config.nsteps; ++n) {
                out << n << ',' << source_history[static_cast<std::size_t>(n)] << '\n';
            }
        }

        {
            std::ofstream out(output_dir / "run_summary.txt");
            if (!out) {
                throw std::runtime_error("Failed to open run_summary.txt");
            }
            out << std::setprecision(16);
            out << "solver=2d_tmz_yee_fdtd\n";
            out << "nx=" << config.nx << '\n';
            out << "ny=" << config.ny << '\n';
            out << "dx=" << config.dx << '\n';
            out << "dy=" << config.dy << '\n';
            out << "dt_cfl=" << dt_cfl << '\n';
            out << "dt=" << dt << '\n';
            out << "nsteps=" << config.nsteps << '\n';
            out << "source_i=" << src_i << '\n';
            out << "source_j=" << src_j << '\n';
            out << "dielectric_center_i=" << cx << '\n';
            out << "dielectric_center_j=" << cy << '\n';
            out << "dielectric_radius=" << radius << '\n';
            out << "dielectric_eps_r=4.0\n";
            out << "ez_min=" << *min_it << '\n';
            out << "ez_max=" << *max_it << '\n';
            out << "ez_max_abs=" << max_abs << '\n';
            out << "vtk_frames=" << (config.write_vtk_frames ? 1 : 0) << '\n';
            out << "save_every=" << config.save_every << '\n';
        }

        std::cout << "Finished 2D TMz Yee FDTD run.\n";
        std::cout << "dt = " << dt << " s\n";
        std::cout << "CFL limit = " << dt_cfl << " s\n";
        std::cout << "Ez range = [" << *min_it << ", " << *max_it << "]\n";
        std::cout << "Output written to " << output_dir << '\n';
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }

    return 0;
}
