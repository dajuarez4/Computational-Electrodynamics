#include <algorithm>
#include <cmath>
#include <complex>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace {

constexpr double kPi = 3.14159265358979323846;

struct Config {
    int nx = 64;
    int ny = 64;
    int nz = 64;
    double lx = 1.0;
    double ly = 1.0;
    double lz = 1.0;
    double eps0 = 1.0;
    std::string scenario = "gaussians";
    std::string output_dir = "output_3d";
};

struct Stats {
    double min_value = 0.0;
    double max_value = 0.0;
    double max_abs_value = 0.0;
};

bool is_power_of_two(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}

void print_usage(const char* program) {
    std::cout
        << "Usage: " << program << " [options]\n"
        << "Options:\n"
        << "  --nx <int>         Number of x grid points (default: 64)\n"
        << "  --ny <int>         Number of y grid points (default: 64)\n"
        << "  --nz <int>         Number of z grid points (default: 64)\n"
        << "  --lx <float>       Domain length in x (default: 1.0)\n"
        << "  --ly <float>       Domain length in y (default: 1.0)\n"
        << "  --lz <float>       Domain length in z (default: 1.0)\n"
        << "  --eps0 <float>     Permittivity factor (default: 1.0)\n"
        << "  --case <name>      gaussians or benchmark (default: gaussians)\n"
        << "  --output <path>    Output directory (default: output_3d)\n"
        << "  --help             Show this message\n";
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
        if (arg == "--nx") {
            config.nx = std::stoi(value);
        } else if (arg == "--ny") {
            config.ny = std::stoi(value);
        } else if (arg == "--nz") {
            config.nz = std::stoi(value);
        } else if (arg == "--lx") {
            config.lx = std::stod(value);
        } else if (arg == "--ly") {
            config.ly = std::stod(value);
        } else if (arg == "--lz") {
            config.lz = std::stod(value);
        } else if (arg == "--eps0") {
            config.eps0 = std::stod(value);
        } else if (arg == "--case") {
            config.scenario = value;
        } else if (arg == "--output") {
            config.output_dir = value;
        } else {
            throw std::runtime_error("Unknown option: " + arg);
        }
    }

    if (!is_power_of_two(config.nx) || !is_power_of_two(config.ny) || !is_power_of_two(config.nz)) {
        throw std::runtime_error("nx, ny, and nz must each be powers of two for the built-in FFT");
    }
    if (config.lx <= 0.0 || config.ly <= 0.0 || config.lz <= 0.0) {
        throw std::runtime_error("Domain lengths must be positive");
    }
    if (config.eps0 <= 0.0) {
        throw std::runtime_error("eps0 must be positive");
    }
    if (config.scenario != "gaussians" && config.scenario != "benchmark") {
        throw std::runtime_error("--case must be either gaussians or benchmark");
    }
    return config;
}

Stats compute_stats(const std::vector<double>& values) {
    const auto [min_it, max_it] = std::minmax_element(values.begin(), values.end());
    Stats stats;
    stats.min_value = *min_it;
    stats.max_value = *max_it;
    stats.max_abs_value = std::max(std::abs(*min_it), std::abs(*max_it));
    return stats;
}

double relative_l2_error(const std::vector<double>& numerical, const std::vector<double>& exact) {
    double diff_norm2 = 0.0;
    double exact_norm2 = 0.0;
    for (std::size_t i = 0; i < numerical.size(); ++i) {
        const double diff = numerical[i] - exact[i];
        diff_norm2 += diff * diff;
        exact_norm2 += exact[i] * exact[i];
    }
    return std::sqrt(diff_norm2 / exact_norm2);
}

void fft1d(std::vector<std::complex<double>>& a, bool inverse) {
    const std::size_t n = a.size();
    for (std::size_t i = 1, j = 0; i < n; ++i) {
        std::size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;
        if (i < j) {
            std::swap(a[i], a[j]);
        }
    }

    for (std::size_t len = 2; len <= n; len <<= 1) {
        const double angle = 2.0 * kPi / static_cast<double>(len) * (inverse ? 1.0 : -1.0);
        const std::complex<double> wlen(std::cos(angle), std::sin(angle));
        for (std::size_t i = 0; i < n; i += len) {
            std::complex<double> w(1.0, 0.0);
            for (std::size_t j = 0; j < len / 2; ++j) {
                const std::complex<double> u = a[i + j];
                const std::complex<double> v = a[i + j + len / 2] * w;
                a[i + j] = u + v;
                a[i + j + len / 2] = u - v;
                w *= wlen;
            }
        }
    }

    if (inverse) {
        const double scale = 1.0 / static_cast<double>(n);
        for (auto& value : a) {
            value *= scale;
        }
    }
}

void fft3d(std::vector<std::complex<double>>& data, int nx, int ny, int nz, bool inverse) {
    const auto index = [ny, nz](int i, int j, int k) -> std::size_t {
        return (static_cast<std::size_t>(i) * ny + j) * nz + k;
    };

    std::vector<std::complex<double>> line;

    line.resize(static_cast<std::size_t>(nz));
    for (int i = 0; i < nx; ++i) {
        for (int j = 0; j < ny; ++j) {
            for (int k = 0; k < nz; ++k) {
                line[static_cast<std::size_t>(k)] = data[index(i, j, k)];
            }
            fft1d(line, inverse);
            for (int k = 0; k < nz; ++k) {
                data[index(i, j, k)] = line[static_cast<std::size_t>(k)];
            }
        }
    }

    line.resize(static_cast<std::size_t>(ny));
    for (int i = 0; i < nx; ++i) {
        for (int k = 0; k < nz; ++k) {
            for (int j = 0; j < ny; ++j) {
                line[static_cast<std::size_t>(j)] = data[index(i, j, k)];
            }
            fft1d(line, inverse);
            for (int j = 0; j < ny; ++j) {
                data[index(i, j, k)] = line[static_cast<std::size_t>(j)];
            }
        }
    }

    line.resize(static_cast<std::size_t>(nx));
    for (int j = 0; j < ny; ++j) {
        for (int k = 0; k < nz; ++k) {
            for (int i = 0; i < nx; ++i) {
                line[static_cast<std::size_t>(i)] = data[index(i, j, k)];
            }
            fft1d(line, inverse);
            for (int i = 0; i < nx; ++i) {
                data[index(i, j, k)] = line[static_cast<std::size_t>(i)];
            }
        }
    }
}

std::vector<double> wave_numbers(int n, double length) {
    std::vector<double> values(static_cast<std::size_t>(n), 0.0);
    const int positive_cutoff = (n - 1) / 2;
    for (int i = 0; i < n; ++i) {
        const int signed_index = (i <= positive_cutoff) ? i : i - n;
        values[static_cast<std::size_t>(i)] = 2.0 * kPi * static_cast<double>(signed_index) / length;
    }
    return values;
}

double gaussian3d(double x, double y, double z, double cx, double cy, double cz, double sigma) {
    const double dx = x - cx;
    const double dy = y - cy;
    const double dz = z - cz;
    return std::exp(-(dx * dx + dy * dy + dz * dz) / (2.0 * sigma * sigma));
}

void write_solution_vti(
    const std::filesystem::path& path,
    const std::vector<double>& rho,
    const std::vector<double>& phi,
    const std::vector<double>& ex,
    const std::vector<double>& ey,
    const std::vector<double>& ez,
    int nx,
    int ny,
    int nz,
    double dx,
    double dy,
    double dz,
    const std::vector<double>* phi_exact = nullptr,
    const std::vector<double>* error = nullptr
) {
    std::ofstream out(path);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    out << "<?xml version=\"1.0\"?>\n";
    out << "<VTKFile type=\"ImageData\" version=\"0.1\" byte_order=\"LittleEndian\">\n";
    out << "  <ImageData WholeExtent=\"0 " << (nx - 1)
        << " 0 " << (ny - 1)
        << " 0 " << (nz - 1)
        << "\" Origin=\"0 0 0\""
        << " Spacing=\"" << dx << ' ' << dy << ' ' << dz << "\">\n";
    out << "    <Piece Extent=\"0 " << (nx - 1)
        << " 0 " << (ny - 1)
        << " 0 " << (nz - 1) << "\">\n";
    out << "      <PointData Scalars=\"phi\" Vectors=\"E\">\n";
    out << std::setprecision(16);

    out << "        <DataArray type=\"Float64\" Name=\"E\" NumberOfComponents=\"3\" format=\"ascii\">\n";
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                out << "          " << ex[id] << ' ' << ey[id] << ' ' << ez[id] << '\n';
            }
        }
    }
    out << "        </DataArray>\n";

    out << "        <DataArray type=\"Float64\" Name=\"E_magnitude\" format=\"ascii\">\n";
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                const double magnitude = std::sqrt(ex[id] * ex[id] + ey[id] * ey[id] + ez[id] * ez[id]);
                out << "          " << magnitude << '\n';
            }
        }
    }
    out << "        </DataArray>\n";

    const auto write_scalar = [&](const std::string& name, const std::vector<double>& values) {
        out << "        <DataArray type=\"Float64\" Name=\"" << name << "\" format=\"ascii\">\n";
        for (int k = 0; k < nz; ++k) {
            for (int j = 0; j < ny; ++j) {
                for (int i = 0; i < nx; ++i) {
                    const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                    out << "          " << values[id] << '\n';
                }
            }
        }
        out << "        </DataArray>\n";
    };

    write_scalar("phi", phi);
    write_scalar("rho", rho);
    if (phi_exact != nullptr) {
        write_scalar("phi_exact", *phi_exact);
    }
    if (error != nullptr) {
        write_scalar("error", *error);
    }

    out << "      </PointData>\n";
    out << "      <CellData/>\n";
    out << "    </Piece>\n";
    out << "  </ImageData>\n";
    out << "</VTKFile>\n";
}

}  // namespace

int main(int argc, char* argv[]) {
    try {
        const Config config = parse_args(argc, argv);
        const auto index = [ny = config.ny, nz = config.nz](int i, int j, int k) -> std::size_t {
            return (static_cast<std::size_t>(i) * ny + j) * nz + k;
        };

        const std::size_t total_size =
            static_cast<std::size_t>(config.nx) * config.ny * config.nz;

        const double dx = config.lx / static_cast<double>(config.nx);
        const double dy = config.ly / static_cast<double>(config.ny);
        const double dz = config.lz / static_cast<double>(config.nz);

        std::vector<double> rho(total_size, 0.0);
        std::vector<double> phi_exact;

        if (config.scenario == "benchmark") {
            phi_exact.assign(total_size, 0.0);
            const double prefactor =
                std::pow(2.0 * kPi / config.lx, 2) +
                std::pow(2.0 * kPi / config.ly, 2) +
                std::pow(2.0 * kPi / config.lz, 2);

            for (int i = 0; i < config.nx; ++i) {
                const double x = i * dx;
                for (int j = 0; j < config.ny; ++j) {
                    const double y = j * dy;
                    for (int k = 0; k < config.nz; ++k) {
                        const double z = k * dz;
                        const double phi_value =
                            std::cos(2.0 * kPi * x / config.lx) *
                            std::cos(2.0 * kPi * y / config.ly) *
                            std::cos(2.0 * kPi * z / config.lz);
                        phi_exact[index(i, j, k)] = phi_value;
                        rho[index(i, j, k)] = config.eps0 * prefactor * phi_value;
                    }
                }
            }
        } else {
            const double sigma = 0.08 * std::min({config.lx, config.ly, config.lz});
            for (int i = 0; i < config.nx; ++i) {
                const double x = i * dx;
                for (int j = 0; j < config.ny; ++j) {
                    const double y = j * dy;
                    for (int k = 0; k < config.nz; ++k) {
                        const double z = k * dz;
                        const double positive = 1.20 * gaussian3d(x, y, z, 0.32 * config.lx, 0.56 * config.ly, 0.50 * config.lz, sigma);
                        const double negative = 1.05 * gaussian3d(x, y, z, 0.69 * config.lx, 0.40 * config.ly, 0.50 * config.lz, sigma);
                        rho[index(i, j, k)] = positive - negative;
                    }
                }
            }
        }

        double rho_mean = 0.0;
        for (double value : rho) {
            rho_mean += value;
        }
        rho_mean /= static_cast<double>(total_size);
        for (double& value : rho) {
            value -= rho_mean;
        }

        std::vector<std::complex<double>> rho_hat(total_size);
        for (std::size_t i = 0; i < total_size; ++i) {
            rho_hat[i] = std::complex<double>(rho[i], 0.0);
        }
        fft3d(rho_hat, config.nx, config.ny, config.nz, false);

        const std::vector<double> kx = wave_numbers(config.nx, config.lx);
        const std::vector<double> ky = wave_numbers(config.ny, config.ly);
        const std::vector<double> kz = wave_numbers(config.nz, config.lz);

        std::vector<std::complex<double>> phi_hat(total_size, std::complex<double>(0.0, 0.0));
        for (int i = 0; i < config.nx; ++i) {
            for (int j = 0; j < config.ny; ++j) {
                for (int k = 0; k < config.nz; ++k) {
                    const std::size_t id = index(i, j, k);
                    const double k2 = kx[static_cast<std::size_t>(i)] * kx[static_cast<std::size_t>(i)] +
                                      ky[static_cast<std::size_t>(j)] * ky[static_cast<std::size_t>(j)] +
                                      kz[static_cast<std::size_t>(k)] * kz[static_cast<std::size_t>(k)];
                    if (k2 > 0.0) {
                        phi_hat[id] = rho_hat[id] / (config.eps0 * k2);
                    }
                }
            }
        }

        std::vector<std::complex<double>> phi_complex = phi_hat;
        fft3d(phi_complex, config.nx, config.ny, config.nz, true);

        std::vector<double> phi(total_size, 0.0);
        for (std::size_t i = 0; i < total_size; ++i) {
            phi[i] = phi_complex[i].real();
        }

        std::vector<std::complex<double>> ex_hat(total_size);
        std::vector<std::complex<double>> ey_hat(total_size);
        std::vector<std::complex<double>> ez_hat(total_size);
        const std::complex<double> imag_unit(0.0, 1.0);
        for (int i = 0; i < config.nx; ++i) {
            for (int j = 0; j < config.ny; ++j) {
                for (int k = 0; k < config.nz; ++k) {
                    const std::size_t id = index(i, j, k);
                    ex_hat[id] = -imag_unit * kx[static_cast<std::size_t>(i)] * phi_hat[id];
                    ey_hat[id] = -imag_unit * ky[static_cast<std::size_t>(j)] * phi_hat[id];
                    ez_hat[id] = -imag_unit * kz[static_cast<std::size_t>(k)] * phi_hat[id];
                }
            }
        }

        fft3d(ex_hat, config.nx, config.ny, config.nz, true);
        fft3d(ey_hat, config.nx, config.ny, config.nz, true);
        fft3d(ez_hat, config.nx, config.ny, config.nz, true);

        std::vector<double> ex(total_size, 0.0);
        std::vector<double> ey(total_size, 0.0);
        std::vector<double> ez(total_size, 0.0);
        for (std::size_t i = 0; i < total_size; ++i) {
            ex[i] = ex_hat[i].real();
            ey[i] = ey_hat[i].real();
            ez[i] = ez_hat[i].real();
        }

        std::vector<std::complex<double>> residual_hat(total_size);
        for (int i = 0; i < config.nx; ++i) {
            for (int j = 0; j < config.ny; ++j) {
                for (int k = 0; k < config.nz; ++k) {
                    const std::size_t id = index(i, j, k);
                    const double k2 = kx[static_cast<std::size_t>(i)] * kx[static_cast<std::size_t>(i)] +
                                      ky[static_cast<std::size_t>(j)] * ky[static_cast<std::size_t>(j)] +
                                      kz[static_cast<std::size_t>(k)] * kz[static_cast<std::size_t>(k)];
                    residual_hat[id] = -k2 * phi_hat[id] + rho_hat[id] / config.eps0;
                }
            }
        }
        fft3d(residual_hat, config.nx, config.ny, config.nz, true);

        std::vector<double> residual(total_size, 0.0);
        for (std::size_t i = 0; i < total_size; ++i) {
            residual[i] = residual_hat[i].real();
        }

        std::vector<double> error;
        double rel_l2 = 0.0;
        double max_error = 0.0;
        if (!phi_exact.empty()) {
            error.resize(total_size, 0.0);
            for (std::size_t i = 0; i < total_size; ++i) {
                error[i] = phi[i] - phi_exact[i];
                max_error = std::max(max_error, std::abs(error[i]));
            }
            rel_l2 = relative_l2_error(phi, phi_exact);
        }

        const Stats phi_stats = compute_stats(phi);
        const Stats rho_stats = compute_stats(rho);
        const Stats residual_stats = compute_stats(residual);
        const double max_abs_e = std::sqrt(
            std::pow(compute_stats(ex).max_abs_value, 2) +
            std::pow(compute_stats(ey).max_abs_value, 2) +
            std::pow(compute_stats(ez).max_abs_value, 2)
        );

        const std::filesystem::path output_dir(config.output_dir);
        std::filesystem::create_directories(output_dir);

        write_solution_vti(
            output_dir / "solution.vti",
            rho,
            phi,
            ex,
            ey,
            ez,
            config.nx,
            config.ny,
            config.nz,
            dx,
            dy,
            dz,
            phi_exact.empty() ? nullptr : &phi_exact,
            error.empty() ? nullptr : &error
        );

        {
            std::ofstream out(output_dir / "run_summary.txt");
            if (!out) {
                throw std::runtime_error("Failed to open run_summary.txt");
            }
            out << std::setprecision(16);
            out << "solver=3d_fft_poisson\n";
            out << "scenario=" << config.scenario << '\n';
            out << "nx=" << config.nx << '\n';
            out << "ny=" << config.ny << '\n';
            out << "nz=" << config.nz << '\n';
            out << "lx=" << config.lx << '\n';
            out << "ly=" << config.ly << '\n';
            out << "lz=" << config.lz << '\n';
            out << "dx=" << dx << '\n';
            out << "dy=" << dy << '\n';
            out << "dz=" << dz << '\n';
            out << "eps0=" << config.eps0 << '\n';
            out << "rho_mean_removed=" << rho_mean << '\n';
            out << "rho_min=" << rho_stats.min_value << '\n';
            out << "rho_max=" << rho_stats.max_value << '\n';
            out << "phi_min=" << phi_stats.min_value << '\n';
            out << "phi_max=" << phi_stats.max_value << '\n';
            out << "residual_max_abs=" << residual_stats.max_abs_value << '\n';
            out << "max_abs_e=" << max_abs_e << '\n';
            if (!phi_exact.empty()) {
                out << "relative_l2_error=" << rel_l2 << '\n';
                out << "max_pointwise_error=" << max_error << '\n';
            }
        }

        std::cout << "Finished 3D FFT Poisson solve.\n";
        std::cout << "Scenario: " << config.scenario << '\n';
        std::cout << "Grid: " << config.nx << " x " << config.ny << " x " << config.nz << '\n';
        std::cout << "Residual max abs: " << residual_stats.max_abs_value << '\n';
        if (!phi_exact.empty()) {
            std::cout << "Relative L2 error: " << rel_l2 << '\n';
            std::cout << "Max pointwise error: " << max_error << '\n';
        }
        std::cout << "Output written to " << output_dir << '\n';
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }

    return 0;
}
