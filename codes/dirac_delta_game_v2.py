"""
Dirac delta visualization/game v2.

This version adds two playable modes:

1. Sampler Lab
   Move a Gaussian delta-sequence over test functions and watch
   the overlap integral converge to f(a).

2. Charge Hunt
   Use a narrow delta-sequence to scan a hidden line-charge profile.
   The score improves when the kernel is both well-centered and sharp.

Controls
--------
Tab            switch mode
Left/Right     move sampling point
Up/Down        shrink / widen epsilon
1-4            switch test function in sampler mode
Space          autoplay in sampler mode / reveal target in hunt mode
R              reset current mode
N              new charge-hunt level
S              save screenshot
H              toggle help
Esc / Q        quit
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import pygame


WIDTH = 1340
HEIGHT = 820
FPS = 60

DOMAIN_MIN = -4.0
DOMAIN_MAX = 4.0
SAMPLES = 1800
LEFT_PAD = 70
TOP_PAD = 78

BG = (8, 12, 20)
PANEL = (17, 24, 37)
PANEL_2 = (22, 31, 47)
GRID = (47, 61, 85)
AXIS = (105, 122, 155)
TEXT = (240, 244, 248)
MUTED = (166, 180, 198)
ACCENT = (255, 118, 82)
CYAN = (104, 220, 255)
YELLOW = (255, 214, 92)
GREEN = (112, 244, 168)
PURPLE = (198, 160, 255)
RED = (255, 90, 105)
BAR = (96, 135, 255)


@dataclass
class FunctionSpec:
    name: str
    expression: str
    fn: callable
    color: tuple[int, int, int]


FUNCTIONS = [
    FunctionSpec(
        "Polynomial + oscillation",
        "f(x) = cos(2x) + 0.15 x^3",
        lambda x: math.cos(2.0 * x) + 0.15 * x**3,
        CYAN,
    ),
    FunctionSpec(
        "Wave packet",
        "f(x) = exp(-x^2 / 2) sin(4x)",
        lambda x: math.exp(-0.5 * x**2) * math.sin(4.0 * x),
        (255, 165, 120),
    ),
    FunctionSpec(
        "Two-bump signal",
        "f(x) = exp(-(x-1.2)^2) - 0.6 exp(-(x+1.3)^2 / 0.5)",
        lambda x: math.exp(-((x - 1.2) ** 2)) - 0.6 * math.exp(-((x + 1.3) ** 2) / 0.5),
        GREEN,
    ),
    FunctionSpec(
        "Piecewise smooth",
        "f(x) = sin(2.5x), x<0; 0.5 cos(3x)+0.3x, x>=0",
        lambda x: math.sin(2.5 * x) if x < 0 else 0.5 * math.cos(3.0 * x) + 0.3 * x,
        PURPLE,
    ),
]


def linspace(start: float, stop: float, count: int) -> list[float]:
    step = (stop - start) / (count - 1)
    return [start + i * step for i in range(count)]


XS = linspace(DOMAIN_MIN, DOMAIN_MAX, SAMPLES)
DX = XS[1] - XS[0]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def trapz(values: list[float], dx: float) -> float:
    return sum(0.5 * (values[i] + values[i + 1]) * dx for i in range(len(values) - 1))


def delta_gaussian(x: float, epsilon: float, center: float) -> float:
    return math.exp(-((x - center) / epsilon) ** 2) / (math.sqrt(math.pi) * epsilon)


def charge_density_profile(x: float, charges: list[tuple[float, float]], sigma: float = 0.12) -> float:
    total = 0.0
    for location, strength in charges:
        total += strength * math.exp(-((x - location) / sigma) ** 2) / (math.sqrt(math.pi) * sigma)
    return total


class DiracDeltaGameV2:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Dirac Delta Game v2")
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock = pygame.time.Clock()

        self.title_font = pygame.font.SysFont("georgia", 34, bold=True)
        self.section_font = pygame.font.SysFont("georgia", 16, bold=True)
        self.body_font = pygame.font.SysFont("georgia", 21)
        self.small_font = pygame.font.SysFont("georgia", 17)
        self.mono_font = pygame.font.SysFont("couriernew", 18)

        self.mode = 0
        self.show_help = True
        self.autoplay = False
        self.time_accum = 0.0

        self.func_index = 0
        self.center = 0.0
        self.epsilon = 0.5

        self.charge_sets = [
            [(-2.35, 0.9), (-0.5, -0.65), (1.5, 1.15), (2.7, -0.55)],
            [(-2.8, -0.85), (-1.1, 1.05), (0.9, 0.72), (2.2, -1.0)],
            [(-2.0, 0.6), (-0.2, 1.25), (1.1, -0.8), (2.9, 0.72)],
        ]
        self.level = 0
        self.reveal_target = False
        self.scan_score = 0.0
        self.best_score = 0.0

        self.main_plot = pygame.Rect(LEFT_PAD, TOP_PAD + 24, 850, 470)
        self.secondary_plot = pygame.Rect(LEFT_PAD, self.main_plot.bottom + 30, 850, 170)
        self.side_panel = pygame.Rect(self.main_plot.right + 26, TOP_PAD + 24, 320, 646)

        self.sampler_y_min = -1.85
        self.sampler_y_max = 3.5
        self.hunt_y_min = -1.9
        self.hunt_y_max = 3.2

        self.screenshot_dir = Path("codes/plots")
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    @property
    def current_spec(self) -> FunctionSpec:
        return FUNCTIONS[self.func_index]

    @property
    def active_charges(self) -> list[tuple[float, float]]:
        return self.charge_sets[self.level]

    def current_y_limits(self) -> tuple[float, float]:
        return (self.sampler_y_min, self.sampler_y_max) if self.mode == 0 else (self.hunt_y_min, self.hunt_y_max)

    def x_to_px(self, x: float, rect: pygame.Rect) -> int:
        ratio = (x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)
        return int(rect.left + ratio * rect.width)

    def y_to_px(self, y: float, rect: pygame.Rect) -> int:
        y_min, y_max = self.current_y_limits() if rect == self.main_plot else (-1.2, 1.2)
        ratio = (y - y_min) / (y_max - y_min)
        return int(rect.bottom - ratio * rect.height)

    def handle_key(self, key: int) -> None:
        if key == pygame.K_TAB:
            self.mode = 1 - self.mode
            self.autoplay = False
        elif key == pygame.K_LEFT:
            self.center -= 0.08
        elif key == pygame.K_RIGHT:
            self.center += 0.08
        elif key == pygame.K_UP:
            self.epsilon *= 0.9
        elif key == pygame.K_DOWN:
            self.epsilon *= 1.11
        elif key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4):
            self.func_index = int(chr(key)) - 1
        elif key == pygame.K_SPACE:
            if self.mode == 0:
                self.autoplay = not self.autoplay
            else:
                self.reveal_target = not self.reveal_target
        elif key == pygame.K_r:
            self.reset_current_mode()
        elif key == pygame.K_n:
            self.level = (self.level + 1) % len(self.charge_sets)
            self.reset_hunt()
        elif key == pygame.K_h:
            self.show_help = not self.show_help
        elif key == pygame.K_s:
            self.save_screenshot()

        self.center = clamp(self.center, DOMAIN_MIN, DOMAIN_MAX)
        self.epsilon = clamp(self.epsilon, 0.03, 1.25)

    def reset_current_mode(self) -> None:
        if self.mode == 0:
            self.center = 0.0
            self.epsilon = 0.5
            self.autoplay = False
        else:
            self.reset_hunt()

    def reset_hunt(self) -> None:
        self.center = 0.0
        self.epsilon = 0.25
        self.reveal_target = False
        self.scan_score = 0.0

    def save_screenshot(self) -> None:
        target = self.screenshot_dir / f"dirac_delta_game_v2_mode_{self.mode + 1}.png"
        pygame.image.save(self.screen, str(target))

    def update(self, dt: float) -> None:
        if self.mode == 0 and self.autoplay:
            self.time_accum += dt
            span = DOMAIN_MAX - DOMAIN_MIN
            self.center = DOMAIN_MIN + 0.5 * (1.0 + math.sin(0.8 * self.time_accum)) * span
        if self.mode == 1:
            density_at_center = charge_density_profile(self.center, self.active_charges)
            localization_bonus = 1.0 / (1.0 + 4.0 * self.epsilon)
            self.scan_score = abs(density_at_center) * localization_bonus
            self.best_score = max(self.best_score, self.scan_score)

    def compute_sampler_state(self) -> dict[str, float | list[float]]:
        values = [self.current_spec.fn(x) for x in XS]
        kernel = [delta_gaussian(x, self.epsilon, self.center) for x in XS]
        product = [v * k for v, k in zip(values, kernel)]
        integral = trapz(product, DX)
        exact = self.current_spec.fn(self.center)
        area = trapz(kernel, DX)
        return {
            "values": values,
            "kernel": kernel,
            "product": product,
            "integral": integral,
            "exact": exact,
            "area": area,
            "error": abs(integral - exact),
        }

    def compute_hunt_state(self) -> dict[str, float | list[float]]:
        density = [charge_density_profile(x, self.active_charges) for x in XS]
        kernel = [delta_gaussian(x, self.epsilon, self.center) for x in XS]
        product = [rho * k for rho, k in zip(density, kernel)]
        overlap = trapz(product, DX)
        exact = charge_density_profile(self.center, self.active_charges)
        return {
            "density": density,
            "kernel": kernel,
            "product": product,
            "overlap": overlap,
            "exact": exact,
            "score": self.scan_score,
        }

    def draw_plot_frame(self, rect: pygame.Rect) -> None:
        pygame.draw.rect(self.screen, PANEL, rect, border_radius=16)
        pygame.draw.rect(self.screen, (52, 66, 92), rect, 2, border_radius=16)

    def draw_grid(self, rect: pygame.Rect, y_min: float, y_max: float) -> None:
        self.draw_plot_frame(rect)
        for i in range(9):
            xv = DOMAIN_MIN + i * (DOMAIN_MAX - DOMAIN_MIN) / 8
            px = self.x_to_px(xv, rect)
            pygame.draw.line(self.screen, GRID, (px, rect.top), (px, rect.bottom), 1)
            label = self.small_font.render(f"{xv:.1f}", True, MUTED)
            self.screen.blit(label, (px - label.get_width() // 2, rect.bottom + 6))
        for i in range(7):
            yv = y_min + i * (y_max - y_min) / 6
            py = int(rect.bottom - ((yv - y_min) / (y_max - y_min)) * rect.height)
            pygame.draw.line(self.screen, GRID, (rect.left, py), (rect.right, py), 1)
        zero_x = self.x_to_px(0.0, rect)
        zero_y = int(rect.bottom - ((0.0 - y_min) / (y_max - y_min)) * rect.height)
        pygame.draw.line(self.screen, AXIS, (zero_x, rect.top), (zero_x, rect.bottom), 2)
        pygame.draw.line(self.screen, AXIS, (rect.left, zero_y), (rect.right, zero_y), 2)

    def draw_curve(self, rect: pygame.Rect, xs: list[float], ys: list[float], color: tuple[int, int, int], width: int = 3) -> None:
        y_min, y_max = self.current_y_limits() if rect == self.main_plot else (-1.2, 1.2)
        points = []
        for x, y in zip(xs, ys):
            px = self.x_to_px(x, rect)
            py = int(rect.bottom - ((y - y_min) / (y_max - y_min)) * rect.height)
            points.append((px, py))
        if len(points) > 1:
            pygame.draw.lines(self.screen, color, False, points, width)

    def draw_filled_product(self, rect: pygame.Rect, ys: list[float], color: tuple[int, int, int]) -> None:
        y_min, y_max = self.current_y_limits()
        zero_y = int(rect.bottom - ((0.0 - y_min) / (y_max - y_min)) * rect.height)
        points = [(self.x_to_px(XS[0], rect), zero_y)]
        for x, y in zip(XS, ys):
            px = self.x_to_px(x, rect)
            py = int(rect.bottom - ((y - y_min) / (y_max - y_min)) * rect.height)
            points.append((px, py))
        points.append((self.x_to_px(XS[-1], rect), zero_y))
        pygame.draw.polygon(self.screen, color, points)

    def draw_sampler_mode(self) -> None:
        state = self.compute_sampler_state()
        self.draw_grid(self.main_plot, self.sampler_y_min, self.sampler_y_max)
        self.draw_filled_product(self.main_plot, state["product"], (70, 115, 255))
        self.draw_curve(self.main_plot, XS, state["values"], self.current_spec.color)
        self.draw_curve(self.main_plot, XS, state["kernel"], YELLOW)
        cx = self.x_to_px(self.center, self.main_plot)
        pygame.draw.line(self.screen, ACCENT, (cx, self.main_plot.top), (cx, self.main_plot.bottom), 2)

        exact = state["exact"]
        ey = int(self.main_plot.bottom - ((exact - self.sampler_y_min) / (self.sampler_y_max - self.sampler_y_min)) * self.main_plot.height)
        pygame.draw.circle(self.screen, GREEN, (cx, ey), 7)

        self.draw_plot_frame(self.secondary_plot)
        self.draw_curve(self.secondary_plot, XS, state["product"], BAR, 3)
        label = self.section_font.render("Overlap density  f(x) delta_epsilon(x-a)", True, TEXT)
        self.screen.blit(label, (self.secondary_plot.left + 16, self.secondary_plot.top + 12))

        legend = [
            (self.current_spec.color, "test function"),
            (YELLOW, "delta-sequence"),
            (BAR, "overlap density"),
            (GREEN, "exact f(a)"),
        ]
        lx = self.main_plot.left + 14
        ly = self.main_plot.top + 14
        for color, text in legend:
            pygame.draw.rect(self.screen, color, (lx, ly + 4, 16, 10), border_radius=3)
            surf = self.small_font.render(text, True, MUTED)
            self.screen.blit(surf, (lx + 24, ly))
            ly += 22

        lines = [
            f"Mode: Sampler Lab",
            f"Function: {self.current_spec.name}",
            self.current_spec.expression,
            f"a = {self.center:+.4f}",
            f"epsilon = {self.epsilon:.4f}",
            f"f(a) = {state['exact']:+.6f}",
            f"integral = {state['integral']:+.6f}",
            f"|error| = {state['error']:.6e}",
            f"area(kernel) = {state['area']:.6f}",
        ]
        self.draw_side_panel(lines, info_text=[
            # "The game is to make the integral and f(a) agree.",
            # "Shrinking epsilon improves localization.",
            # "Moving a tests the sifting property everywhere.",
        ])

    def draw_hunt_mode(self) -> None:
        state = self.compute_hunt_state()
        self.draw_grid(self.main_plot, self.hunt_y_min, self.hunt_y_max)
        self.draw_filled_product(self.main_plot, state["product"], (96, 66, 160))
        self.draw_curve(self.main_plot, XS, state["density"], CYAN)
        self.draw_curve(self.main_plot, XS, state["kernel"], YELLOW)
        cx = self.x_to_px(self.center, self.main_plot)
        pygame.draw.line(self.screen, ACCENT, (cx, self.main_plot.top), (cx, self.main_plot.bottom), 2)

        if self.reveal_target:
            for loc, strength in self.active_charges:
                px = self.x_to_px(loc, self.main_plot)
                py = int(self.main_plot.bottom - ((strength - self.hunt_y_min) / (self.hunt_y_max - self.hunt_y_min)) * self.main_plot.height)
                pygame.draw.circle(self.screen, RED if strength < 0 else GREEN, (px, py), 8)

        self.draw_plot_frame(self.secondary_plot)
        self.draw_curve(self.secondary_plot, XS, state["density"], CYAN, 2)
        self.draw_curve(self.secondary_plot, XS, [0.3 * k for k in state["kernel"]], YELLOW, 2)
        title = self.section_font.render("Charge Hunt: use the kernel to detect localized sources", True, TEXT)
        self.screen.blit(title, (self.secondary_plot.left + 16, self.secondary_plot.top + 12))

        score_meter_x = self.secondary_plot.left + 18
        score_meter_y = self.secondary_plot.bottom - 42
        score_w = self.secondary_plot.width - 36
        pygame.draw.rect(self.screen, GRID, (score_meter_x, score_meter_y, score_w, 18), border_radius=9)
        normalized = clamp(self.scan_score / 2.8, 0.0, 1.0)
        pygame.draw.rect(self.screen, GREEN, (score_meter_x, score_meter_y, int(score_w * normalized), 18), border_radius=9)

        lines = [
            "Mode: Charge Hunt",
            f"Level = {self.level + 1}",
            f"a = {self.center:+.4f}",
            f"epsilon = {self.epsilon:.4f}",
            f"rho(a) = {state['exact']:+.6f}",
            f"overlap = {state['overlap']:+.6f}",
            f"scan score = {self.scan_score:.6f}",
            f"best score = {self.best_score:.6f}",
            "Press Space to reveal source locations.",
            "Press N for a new level.",
        ]
        self.draw_side_panel(lines, info_text=[
            "A narrow delta acts like a detector.",
            "Strong score means you are centered on a source",
            "and epsilon is sharp enough to localize it.",
        ])

    def draw_side_panel(self, lines: list[str], info_text: list[str]) -> None:
        pygame.draw.rect(self.screen, PANEL_2, self.side_panel, border_radius=18)
        pygame.draw.rect(self.screen, (58, 72, 98), self.side_panel, 2, border_radius=18)

        y = self.side_panel.top + 18
        header = self.section_font.render("Monitor", True, TEXT)
        self.screen.blit(header, (self.side_panel.left + 16, y))
        y += 38
        for line in lines:
            font = self.mono_font if "=" in line or line.startswith("f(") or line.startswith("rho") else self.body_font
            surf = font.render(line, True, TEXT if y < self.side_panel.top + 250 else MUTED)
            self.screen.blit(surf, (self.side_panel.left + 16, y))
            y += 30

        y += 12
        subheader = self.body_font.render(" ", True, ACCENT)
        self.screen.blit(subheader, (self.side_panel.left + 16, y))
        y += 34
        for line in info_text:
            surf = self.small_font.render(line, True, MUTED)
            self.screen.blit(surf, (self.side_panel.left + 16, y))
            y += 24

        if self.show_help:
            y = self.side_panel.bottom - 150
            help_lines = [
                "Tab switch mode",
                "Arrows move a / change epsilon",
                "1-4 choose function",
                "R reset   S save screenshot",
                "H hide help   Esc quit",
            ]
            help_header = self.body_font.render("Controls", True, PURPLE)
            self.screen.blit(help_header, (self.side_panel.left + 16, y))
            y += 32
            for line in help_lines:
                surf = self.small_font.render(line, True, MUTED)
                self.screen.blit(surf, (self.side_panel.left + 16, y))
                y += 22

    def draw_title(self) -> None:
        title = self.title_font.render("Dirac Delta Game v2", True, TEXT)
        self.screen.blit(title, (LEFT_PAD, 18))
        subtitle = (
            "Sampler Lab: integral tends to f(a).  Charge Hunt: the delta-sequence becomes a detector for localized sources."
        )
        self.screen.blit(self.small_font.render(subtitle, True, MUTED), (LEFT_PAD, 54))

    def draw(self) -> None:
        self.screen.fill(BG)
        self.draw_title()
        if self.mode == 0:
            self.draw_sampler_mode()
        else:
            self.draw_hunt_mode()
        pygame.display.flip()

    def run(self) -> None:
        while True:
            dt = self.clock.tick(FPS) / 1000.0
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    return
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_ESCAPE, pygame.K_q):
                        pygame.quit()
                        return
                    self.handle_key(event.key)
            self.update(dt)
            self.draw()


def main() -> int:
    DiracDeltaGameV2().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
