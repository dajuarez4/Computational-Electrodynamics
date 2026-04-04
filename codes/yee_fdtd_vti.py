from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np


@dataclass
class VTIGrid:
    path: Path
    shape: tuple[int, int, int]
    spacing: tuple[float, float, float]
    origin: tuple[float, float, float]
    point_data: dict[str, np.ndarray]


@dataclass
class PVDEntry:
    timestep: float
    path: Path


def _parse_extent(extent_text: str) -> tuple[int, int, int]:
    values = [int(value) for value in extent_text.split()]
    if len(values) != 6:
        raise ValueError(f"Expected 6 extent values, got {values}")
    nx = values[1] - values[0] + 1
    ny = values[3] - values[2] + 1
    nz = values[5] - values[4] + 1
    return nx, ny, nz


def _parse_triplet(text: str | None, default: tuple[float, float, float]) -> tuple[float, float, float]:
    if not text:
        return default
    values = tuple(float(value) for value in text.split())
    if len(values) != 3:
        raise ValueError(f"Expected 3 values, got {values}")
    return values


def read_vti(path: str | Path) -> VTIGrid:
    file_path = Path(path)
    root = ET.parse(file_path).getroot()
    image_data = root.find("ImageData")
    if image_data is None:
        raise ValueError(f"{file_path} does not contain an ImageData block")

    shape = _parse_extent(image_data.attrib["WholeExtent"])
    spacing = _parse_triplet(image_data.attrib.get("Spacing"), (1.0, 1.0, 1.0))
    origin = _parse_triplet(image_data.attrib.get("Origin"), (0.0, 0.0, 0.0))

    point_data_block = image_data.find("./Piece/PointData")
    point_data: dict[str, np.ndarray] = {}
    if point_data_block is not None:
        nx, ny, nz = shape
        for data_array in point_data_block.findall("DataArray"):
            name = data_array.attrib.get("Name", "unnamed")
            ncomp = int(data_array.attrib.get("NumberOfComponents", "1"))
            raw = np.fromstring((data_array.text or "").strip(), sep=" ")
            expected_size = nx * ny * nz * ncomp
            if raw.size != expected_size:
                raise ValueError(
                    f"{file_path}: array {name!r} has size {raw.size}, expected {expected_size}"
                )

            if ncomp == 1:
                values = raw.reshape((nz, ny, nx)).transpose(2, 1, 0)
            else:
                values = raw.reshape((nz, ny, nx, ncomp)).transpose(2, 1, 0, 3)
            point_data[name] = values

    return VTIGrid(
        path=file_path,
        shape=shape,
        spacing=spacing,
        origin=origin,
        point_data=point_data,
    )


def read_pvd(path: str | Path) -> list[PVDEntry]:
    file_path = Path(path)
    root = ET.parse(file_path).getroot()
    entries: list[PVDEntry] = []
    for dataset in root.findall(".//DataSet"):
        timestep = float(dataset.attrib.get("timestep", "0.0"))
        relative_path = Path(dataset.attrib["file"])
        entries.append(PVDEntry(timestep=timestep, path=(file_path.parent / relative_path).resolve()))
    return entries
