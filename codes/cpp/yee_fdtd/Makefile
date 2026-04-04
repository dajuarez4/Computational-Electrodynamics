CXX ?= clang++
CXXFLAGS ?= -std=c++17 -O3 -Wall -Wextra -pedantic

TARGETS = yee_fdtd_tmz yee_fdtd_3d

.PHONY: all run run3d clean

all: $(TARGETS)

yee_fdtd_tmz: yee_fdtd_tmz.cpp
	$(CXX) $(CXXFLAGS) yee_fdtd_tmz.cpp -o yee_fdtd_tmz

yee_fdtd_3d: yee_fdtd_3d.cpp
	$(CXX) $(CXXFLAGS) yee_fdtd_3d.cpp -o yee_fdtd_3d

run: yee_fdtd_tmz
	./yee_fdtd_tmz

run3d: yee_fdtd_3d
	./yee_fdtd_3d

clean:
	rm -f $(TARGETS)
