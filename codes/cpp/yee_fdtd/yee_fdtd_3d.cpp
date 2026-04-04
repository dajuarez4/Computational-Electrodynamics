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
    int nx = 48;
    int ny = 48;
    int nz = 48;
    double dx = 1.0e-3;
    double dy = 1.0e-3;
    double dz = 1.0e-3;
    int nsteps = 160;
    int save_every = 20;
    bool write_frames = true;
    std::string output_dir = "output_3d";
};

void print_usage(const char* program) {
    std::cout
        << "Usage: " << program << " [options]\n"
        << "Options:\n"
        << "  --nx <int>           Number of x cells (default: 48)\n"
        << "  --ny <int>           Number of y cells (default: 48)\n"
        << "  --nz <int>           Number of z cells (default: 48)\n"
        << "  --nsteps <int>       Number of time steps (default: 160)\n"
        << "  --save-every <int>   Save a frame every N steps (default: 20)\n"
        << "  --frames <0|1>       Write time-series frames for ParaView (default: 1)\n"
        << "  --output <path>      Output directory (default: output_3d)\n"
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
        if (arg == "--nx") {
            config.nx = std::stoi(value);
        } else if (arg == "--ny") {
            config.ny = std::stoi(value);
        } else if (arg == "--nz") {
            config.nz = std::stoi(value);
        } else if (arg == "--nsteps") {
            config.nsteps = std::stoi(value);
        } else if (arg == "--save-every") {
            config.save_every = std::stoi(value);
        } else if (arg == "--frames") {
            config.write_frames = (std::stoi(value) != 0);
        } else if (arg == "--output") {
            config.output_dir = value;
        } else {
            throw std::runtime_error("Unknown option: " + arg);
        }
    }

    if (config.nx < 8 || config.ny < 8 || config.nz < 8) {
        throw std::runtime_error("Grid dimensions must be at least 8 in each direction");
    }
    if (config.nsteps <= 0) {
        throw std::runtime_error("--nsteps must be positive");
    }
    if (config.save_every <= 0) {
        throw std::runtime_error("--save-every must be positive");
    }
    return config;
}

struct Stats {
    double min_value = 0.0;
    double max_value = 0.0;
    double max_abs_value = 0.0;
};

Stats compute_stats(const std::vector<double>& values) {
    const auto [min_it, max_it] = std::minmax_element(values.begin(), values.end());
    Stats stats;
    stats.min_value = *min_it;
    stats.max_value = *max_it;
    stats.max_abs_value = std::max(std::abs(*min_it), std::abs(*max_it));
    return stats;
}

void write_vector_vti(
    const std::filesystem::path& path,
    const std::vector<double>& ex,
    const std::vector<double>& ey,
    const std::vector<double>& ez,
    const std::vector<double>& eps_r,
    int nx,
    int ny,
    int nz,
    double dx,
    double dy,
    double dz
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
    out << "      <PointData Scalars=\"E_magnitude\" Vectors=\"E\">\n";
    out << "        <DataArray type=\"Float64\" Name=\"E\" NumberOfComponents=\"3\" format=\"ascii\">\n";
    out << std::setprecision(16);
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                out << "          "
                    << ex[id] << ' '
                    << ey[id] << ' '
                    << ez[id] << '\n';
            }
        }
    }
    out << "        </DataArray>\n";

    out << "        <DataArray type=\"Float64\" Name=\"E_magnitude\" format=\"ascii\">\n";
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                const double magnitude = std::sqrt(
                    ex[id] * ex[id] + ey[id] * ey[id] + ez[id] * ez[id]
                );
                out << "          " << magnitude << '\n';
            }
        }
    }
    out << "        </DataArray>\n";

    out << "        <DataArray type=\"Float64\" Name=\"eps_r\" format=\"ascii\">\n";
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                out << "          " << eps_r[id] << '\n';
            }
        }
    }
    out << "        </DataArray>\n";
    out << "      </PointData>\n";
    out << "      <CellData/>\n";
    out << "    </Piece>\n";
    out << "  </ImageData>\n";
    out << "</VTKFile>\n";
}

void write_scalar_vti(
    const std::filesystem::path& path,
    const std::vector<double>& values,
    const std::string& field_name,
    int nx,
    int ny,
    int nz,
    double dx,
    double dy,
    double dz
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
    out << "      <PointData Scalars=\"" << field_name << "\">\n";
    out << "        <DataArray type=\"Float64\" Name=\"" << field_name << "\" format=\"ascii\">\n";
    out << std::setprecision(16);
    for (int k = 0; k < nz; ++k) {
        for (int j = 0; j < ny; ++j) {
            for (int i = 0; i < nx; ++i) {
                const std::size_t id = (static_cast<std::size_t>(i) * ny + j) * nz + k;
                out << "          " << values[id] << '\n';
            }
        }
    }
    out << "        </DataArray>\n";
    out << "      </PointData>\n";
    out << "      <CellData/>\n";
    out << "    </Piece>\n";
    out << "  </ImageData>\n";
    out << "</VTKFile>\n";
}

void write_pvd_collection(
    const std::filesystem::path& path,
    const std::vector<std::string>& frame_files,
    const std::vector<double>& times
) {
    std::ofstream out(path);
    if (!out) {
        throw std::runtime_error("Failed to open " + path.string());
    }

    out << "<?xml version=\"1.0\"?>\n";
    out << "<VTKFile type=\"Collection\" version=\"0.1\" byte_order=\"LittleEndian\">\n";
    out << "  <Collection>\n";
    out << std::setprecision(16);
    for (std::size_t i = 0; i < frame_files.size(); ++i) {
        out << "    <DataSet timestep=\"" << times[i]
            << "\" group=\"\" part=\"0\" file=\"" << frame_files[i] << "\"/>\n";
    }
    out << "  </Collection>\n";
    out << "</VTKFile>\n";
}

}  // namespace

int main(int argc, char* argv[]) {
    try {
        const Config config = parse_args(argc, argv);

        constexpr double pi = 3.14159265358979323846;
        constexpr double c0 = 299792458.0;
        constexpr double mu0 = 4.0e-7 * pi;
        constexpr double eps0 = 1.0 / (mu0 * c0 * c0);

        const double dt_cfl = 1.0 / (
            c0 * std::sqrt(
                (1.0 / (config.dx * config.dx)) +
                (1.0 / (config.dy * config.dy)) +
                (1.0 / (config.dz * config.dz))
            )
        );
        const double dt = 0.99 * dt_cfl;

        const auto index = [ny = config.ny, nz = config.nz](int i, int j, int k) -> std::size_t {
            return (static_cast<std::size_t>(i) * ny + j) * nz + k;
        };

        const std::size_t total_size =
            static_cast<std::size_t>(config.nx) * config.ny * config.nz;

        std::vector<double> eps_r(total_size, 1.0);
        std::vector<double> eps(total_size, eps0);
        std::vector<double> ex(total_size, 0.0);
        std::vector<double> ey(total_size, 0.0);
        std::vector<double> ez(total_size, 0.0);
        std::vector<double> hx(total_size, 0.0);
        std::vector<double> hy(total_size, 0.0);
        std::vector<double> hz(total_size, 0.0);
        std::vector<double> source_history(static_cast<std::size_t>(config.nsteps), 0.0);
        std::vector<std::string> frame_files;
        std::vector<double> frame_times;

        const int cx = config.nx / 2;
        const int cy = config.ny / 2;
        const int cz = config.nz / 2;
        const int radius = std::max(4, std::min({config.nx, config.ny, config.nz}) / 6);
        const int src_i = config.nx / 4;
        const int src_j = config.ny / 2;
        const int src_k = config.nz / 2;
        const int t0 = 30;
        const int spread = 10;

        for (int i = 0; i < config.nx; ++i) {
            for (int j = 0; j < config.ny; ++j) {
                for (int k = 0; k < config.nz; ++k) {
                    const int dx_i = i - cx;
                    const int dy_j = j - cy;
                    const int dz_k = k - cz;
                    if ((dx_i * dx_i) + (dy_j * dy_j) + (dz_k * dz_k) < radius * radius) {
                        eps_r[index(i, j, k)] = 4.0;
                    }
                    eps[index(i, j, k)] = eps0 * eps_r[index(i, j, k)];
                }
            }
        }

        const std::filesystem::path output_dir(config.output_dir);
        const std::filesystem::path frames_dir = output_dir / "frames";
        std::filesystem::create_directories(output_dir);
        if (config.write_frames) {
            std::filesystem::create_directories(frames_dir);
        }

        auto gaussian_pulse = [center = static_cast<double>(t0), width = static_cast<double>(spread)](int n) -> double {
            const double scaled = (static_cast<double>(n) - center) / width;
            return std::exp(-0.5 * scaled * scaled);
        };

        for (int n = 0; n < config.nsteps; ++n) {
            for (int i = 0; i < config.nx; ++i) {
                for (int j = 0; j < config.ny - 1; ++j) {
                    for (int k = 0; k < config.nz - 1; ++k) {
                        const std::size_t id = index(i, j, k);
                        hx[id] -= (dt / mu0) * (
                            (ez[index(i, j + 1, k)] - ez[id]) / config.dy -
                            (ey[index(i, j, k + 1)] - ey[id]) / config.dz
                        );
                    }
                }
            }

            for (int i = 0; i < config.nx - 1; ++i) {
                for (int j = 0; j < config.ny; ++j) {
                    for (int k = 0; k < config.nz - 1; ++k) {
                        const std::size_t id = index(i, j, k);
                        hy[id] -= (dt / mu0) * (
                            (ex[index(i, j, k + 1)] - ex[id]) / config.dz -
                            (ez[index(i + 1, j, k)] - ez[id]) / config.dx
                        );
                    }
                }
            }

            for (int i = 0; i < config.nx - 1; ++i) {
                for (int j = 0; j < config.ny - 1; ++j) {
                    for (int k = 0; k < config.nz; ++k) {
                        const std::size_t id = index(i, j, k);
                        hz[id] -= (dt / mu0) * (
                            (ey[index(i + 1, j, k)] - ey[id]) / config.dx -
                            (ex[index(i, j + 1, k)] - ex[id]) / config.dy
                        );
                    }
                }
            }

            for (int i = 1; i < config.nx - 1; ++i) {
                for (int j = 1; j < config.ny - 1; ++j) {
                    for (int k = 1; k < config.nz - 1; ++k) {
                        const std::size_t id = index(i, j, k);
                        ex[id] += (dt / eps[id]) * (
                            (hz[id] - hz[index(i, j - 1, k)]) / config.dy -
                            (hy[id] - hy[index(i, j, k - 1)]) / config.dz
                        );
                        ey[id] += (dt / eps[id]) * (
                            (hx[id] - hx[index(i, j, k - 1)]) / config.dz -
                            (hz[id] - hz[index(i - 1, j, k)]) / config.dx
                        );
                        ez[id] += (dt / eps[id]) * (
                            (hy[id] - hy[index(i - 1, j, k)]) / config.dx -
                            (hx[id] - hx[index(i, j - 1, k)]) / config.dy
                        );
                    }
                }
            }

            const double source_value = gaussian_pulse(n);
            source_history[static_cast<std::size_t>(n)] = source_value;
            ez[index(src_i, src_j, src_k)] += source_value;

            for (int i = 0; i < config.nx; ++i) {
                for (int j = 0; j < config.ny; ++j) {
                    ex[index(i, j, 0)] = 0.0;
                    ex[index(i, j, config.nz - 1)] = 0.0;
                    ey[index(i, j, 0)] = 0.0;
                    ey[index(i, j, config.nz - 1)] = 0.0;
                    ez[index(i, j, 0)] = 0.0;
                    ez[index(i, j, config.nz - 1)] = 0.0;
                }
            }
            for (int i = 0; i < config.nx; ++i) {
                for (int k = 0; k < config.nz; ++k) {
                    ex[index(i, 0, k)] = 0.0;
                    ex[index(i, config.ny - 1, k)] = 0.0;
                    ey[index(i, 0, k)] = 0.0;
                    ey[index(i, config.ny - 1, k)] = 0.0;
                    ez[index(i, 0, k)] = 0.0;
                    ez[index(i, config.ny - 1, k)] = 0.0;
                }
            }
            for (int j = 0; j < config.ny; ++j) {
                for (int k = 0; k < config.nz; ++k) {
                    ex[index(0, j, k)] = 0.0;
                    ex[index(config.nx - 1, j, k)] = 0.0;
                    ey[index(0, j, k)] = 0.0;
                    ey[index(config.nx - 1, j, k)] = 0.0;
                    ez[index(0, j, k)] = 0.0;
                    ez[index(config.nx - 1, j, k)] = 0.0;
                }
            }

            if (config.write_frames && (n % config.save_every == 0)) {
                std::ostringstream name;
                name << "frame_" << std::setw(4) << std::setfill('0') << n << ".vti";
                const std::string relative_path = "frames/" + name.str();
                write_vector_vti(
                    output_dir / relative_path,
                    ex,
                    ey,
                    ez,
                    eps_r,
                    config.nx,
                    config.ny,
                    config.nz,
                    config.dx,
                    config.dy,
                    config.dz
                );
                frame_files.push_back(relative_path);
                frame_times.push_back(n * dt);
            }
        }

        write_vector_vti(
            output_dir / "E_final.vti",
            ex,
            ey,
            ez,
            eps_r,
            config.nx,
            config.ny,
            config.nz,
            config.dx,
            config.dy,
            config.dz
        );
        write_scalar_vti(
            output_dir / "material_map.vti",
            eps_r,
            "eps_r",
            config.nx,
            config.ny,
            config.nz,
            config.dx,
            config.dy,
            config.dz
        );

        if (config.write_frames) {
            write_pvd_collection(output_dir / "frames.pvd", frame_files, frame_times);
        }

        {
            std::ofstream out(output_dir / "source_history.csv");
            if (!out) {
                throw std::runtime_error("Failed to open source_history.csv");
            }
            out << "step,time,source\n";
            out << std::setprecision(16);
            for (int n = 0; n < config.nsteps; ++n) {
                out << n << ',' << (n * dt) << ',' << source_history[static_cast<std::size_t>(n)] << '\n';
            }
        }

        const Stats ex_stats = compute_stats(ex);
        const Stats ey_stats = compute_stats(ey);
        const Stats ez_stats = compute_stats(ez);

        {
            std::ofstream out(output_dir / "run_summary.txt");
            if (!out) {
                throw std::runtime_error("Failed to open run_summary.txt");
            }
            out << std::setprecision(16);
            out << "solver=3d_yee_fdtd\n";
            out << "nx=" << config.nx << '\n';
            out << "ny=" << config.ny << '\n';
            out << "nz=" << config.nz << '\n';
            out << "dx=" << config.dx << '\n';
            out << "dy=" << config.dy << '\n';
            out << "dz=" << config.dz << '\n';
            out << "dt_cfl=" << dt_cfl << '\n';
            out << "dt=" << dt << '\n';
            out << "nsteps=" << config.nsteps << '\n';
            out << "source_i=" << src_i << '\n';
            out << "source_j=" << src_j << '\n';
            out << "source_k=" << src_k << '\n';
            out << "sphere_center_i=" << cx << '\n';
            out << "sphere_center_j=" << cy << '\n';
            out << "sphere_center_k=" << cz << '\n';
            out << "sphere_radius=" << radius << '\n';
            out << "sphere_eps_r=4.0\n";
            out << "ex_min=" << ex_stats.min_value << '\n';
            out << "ex_max=" << ex_stats.max_value << '\n';
            out << "ey_min=" << ey_stats.min_value << '\n';
            out << "ey_max=" << ey_stats.max_value << '\n';
            out << "ez_min=" << ez_stats.min_value << '\n';
            out << "ez_max=" << ez_stats.max_value << '\n';
            out << "max_abs_e="
                << std::max({ex_stats.max_abs_value, ey_stats.max_abs_value, ez_stats.max_abs_value})
                << '\n';
            out << "write_frames=" << (config.write_frames ? 1 : 0) << '\n';
            out << "save_every=" << config.save_every << '\n';
        }

        std::cout << "Finished 3D Yee FDTD run.\n";
        std::cout << "dt = " << dt << " s\n";
        std::cout << "CFL limit = " << dt_cfl << " s\n";
        std::cout << "Output written to " << output_dir << '\n';
        if (config.write_frames) {
            std::cout << "ParaView time series manifest: " << (output_dir / "frames.pvd") << '\n';
        }
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }

    return 0;
}
