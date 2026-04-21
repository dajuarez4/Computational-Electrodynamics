cmake_minimum_required(VERSION 3.18)

project(amrex_fft_poisson_benchmark LANGUAGES CXX)

if(DEFINED AMReX_ROOT)
    list(PREPEND CMAKE_PREFIX_PATH "${AMReX_ROOT}")
endif()

find_package(AMReX REQUIRED CONFIG COMPONENTS 3D FFT)

add_executable(amrex_fft_poisson_benchmark main.cpp)
target_compile_features(amrex_fft_poisson_benchmark PRIVATE cxx_std_17)
target_link_libraries(amrex_fft_poisson_benchmark PRIVATE AMReX::amrex_3d)
