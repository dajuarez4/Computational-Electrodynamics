CXX ?= clang++
CXXFLAGS ?= -std=c++17 -O3 -Wall -Wextra -pedantic

TARGET = fft_poisson_3d

.PHONY: all run clean

all: $(TARGET)

$(TARGET): fft_poisson_3d.cpp
	$(CXX) $(CXXFLAGS) fft_poisson_3d.cpp -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
