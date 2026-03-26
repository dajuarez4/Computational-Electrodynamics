"""
Interactive Pygame visualization of the Dirac delta function as a useful object.

The core idea is to show that a narrow, normalized Gaussian acts like a sampling
device. The player moves the center a and width epsilon of a delta-sequence
across several test functions and watches

    integral f(x) delta_epsilon(x-a) dx

approach the exact value f(a).

Controls
--------
Left / Right    move the sampling point a
Up / Down       shrink / widen epsilon
1-4             switch test function
Space           toggle autoplay sweep
R               reset a and epsilon
H               toggle help overlay
Esc / Q         quit
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass

try:
    import pygame
except ImportError as exc:  # pragma: no cover - graceful runtime failure
    print("This script requires pygame. Install it with: pip install pygame")
    raise SystemExit(1) from exc


WIDTH = 1280
HEIGHT = 760
FPS = 60

LEFT_PAD = 80
RIGHT_PAD = 50
TOP_PAD = 70
BOTTOM_PAD = 90

DOMAIN_MIN = -4.0
DOMAIN_MAX = 4.0
SAMPLES = 1400

BG = (10, 13, 18)
PANEL = (18, 24, 33)
GRID = (45, 57, 75)
TEXT = (234, 239, 245)
MUTED = (155, 170, 188)
ACCENT = (255, 120, 70)
CURVE = (120, 215, 255)
GAUSS = (255, 210, 80)
MATCH = (90, 245, 160)
WARNING = (255, 100, 100)
BAR = (110, 125, 255)


@dataclass
class FunctionSpec:
    name: str
    expression: str
    fn: callable
    color: tuple[int, int, int]


FUNCTIONS = [
    FunctionSpec(
        name="Polynomial + oscillation",
        expression="f(x) = cos(2x) + 0.15 x^3",
        fn=lambda x: math.cos(2.0 * x) + 0.15 * x**3,
        color=(110, 215, 255),
    ),
    FunctionSpec(
        name="Gaussian wave packet",
        expression="f(x) = exp(-x^2 / 2) sin(4x)",
        fn=lambda x: math.exp(-0.5 * x**2) * math.sin(4.0 * x),
        color=(255, 160, 110),
    ),
    FunctionSpec(
        name="Localized bump",
        expression="f(x) = exp(-(x-1.2)^2) - 0.6 exp(-(x+1.3)^2 / 0.5)",
        fn=lambda x: math.exp(-((x - 1.2) ** 2)) - 0.6 * math.exp(-((x + 1.3) ** 2) / 0.5),
        color=(160, 250, 170),
    ),
    FunctionSpec(
        name="Piecewise smooth",
        expression="f(x) = sin(2.5x) for x<0, 0.5 cos(3x)+0.3x for x>=0",
        fn=lambda x: math.sin(2.5 * x) if x < 0 else 0.5 * math.cos(3.0 * x) + 0.3 * x,
        color=(200, 170, 255),
    ),
]


def linspace(start: float, stop: float, count: int) -> list[float]:
    if count <= 1:
        return [start]
    step = (stop - start) / (count - 1)
    return [start + i * step for i in range(count)]


XS = linspace(DOMAIN_MIN, DOMAIN_MAX, SAMPLES)
DX = XS[1] - XS[0]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def delta_gaussian(x: float, epsilon: float, center: float) -> float:
    return math.exp(-((x - center) / epsilon) ** 2) / (math.sqrt(math.pi) * epsilon)


def trapz(values: list[float], dx: float) -> float:
    total = 0.0
    for i in range(len(values) - 1):
        total += 0.5 * (values[i] + values[i + 1]) * dx
    return total


def fmt_signed(value: float) -> str:
    return f"{value:+.5f}"


class DiracDeltaGame:
    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("Dirac Delta Game")
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock = pygame.time.Clock()

        self.title_font = pygame.font.SysFont("georgia", 32, bold=True)
        self.body_font = pygame.font.SysFont("georgia", 20)
        self.small_font = pygame.font.SysFont("georgia", 12)
        self.mono_font = pygame.font.SysFont("couriernew", 16)

        self.func_index = 0
        self.center = 0.0
        self.epsilon = 0.55
        self.autoplay = False
        self.show_help = True
        self.time_accum = 0.0

        self.plot_rect = pygame.Rect(LEFT_PAD, TOP_PAD + 30, 820, 470)
        self.side_rect = pygame.Rect(self.plot_rect.right + 30, TOP_PAD + 30, 300, 470)
        self.bottom_rect = pygame.Rect(LEFT_PAD, self.plot_rect.bottom + 25, WIDTH - LEFT_PAD - RIGHT_PAD, 140)

        self.y_min = -1.8
        self.y_max = 3.4

    @property
    def current_spec(self) -> FunctionSpec:
        return FUNCTIONS[self.func_index]

    def x_to_px(self, x: float) -> int:
        ratio = (x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)
        return int(self.plot_rect.left + ratio * self.plot_rect.width)

    def y_to_px(self, y: float) -> int:
        ratio = (y - self.y_min) / (self.y_max - self.y_min)
        return int(self.plot_rect.bottom - ratio * self.plot_rect.height)

    def compute_state(self) -> dict[str, float | list[float]]:
        values = [self.current_spec.fn(x) for x in XS]
        gauss = [delta_gaussian(x, self.epsilon, self.center) for x in XS]
        product = [v * g for v, g in zip(values, gauss)]
        integral = trapz(product, DX)
        exact = self.current_spec.fn(self.center)
        area = trapz(gauss, DX)
        error = abs(integral - exact)
        peak = max(gauss)
        return {
            "values": values,
            "gauss": gauss,
            "product": product,
            "integral": integral,
            "exact": exact,
            "area": area,
            "error": error,
            "peak": peak,
        }

    def draw_grid(self) -> None:
        pygame.draw.rect(self.screen, PANEL, self.plot_rect, border_radius=16)
        pygame.draw.rect(self.screen, (50, 62, 85), self.plot_rect, 2, border_radius=16)

        for x in range(9):
            xv = DOMAIN_MIN + x * (DOMAIN_MAX - DOMAIN_MIN) / 8
            px = self.x_to_px(xv)
            pygame.draw.line(self.screen, GRID, (px, self.plot_rect.top), (px, self.plot_rect.bottom), 1)
            label = self.small_font.render(f"{xv:.1f}", True, MUTED)
            self.screen.blit(label, (px - label.get_width() // 2, self.plot_rect.bottom + 8))

        for y in range(7):
            yv = self.y_min + y * (self.y_max - self.y_min) / 6
            py = self.y_to_px(yv)
            pygame.draw.line(self.screen, GRID, (self.plot_rect.left, py), (self.plot_rect.right, py), 1)
            label = self.small_font.render(f"{yv:.1f}", True, MUTED)
            self.screen.blit(label, (self.plot_rect.left - 55, py - 10))

        zero_x = self.x_to_px(0.0)
        zero_y = self.y_to_px(0.0)
        pygame.draw.line(self.screen, (95, 110, 140), (zero_x, self.plot_rect.top), (zero_x, self.plot_rect.bottom), 2)
        pygame.draw.line(self.screen, (95, 110, 140), (self.plot_rect.left, zero_y), (self.plot_rect.right, zero_y), 2)

    def draw_curve(self, xs: list[float], ys: list[float], color: tuple[int, int, int], width: int = 3) -> None:
        points = [(self.x_to_px(x), self.y_to_px(y)) for x, y in zip(xs, ys)]
        pygame.draw.lines(self.screen, color, False, points, width)

    def draw_shaded_product(self, product: list[float]) -> None:
        points = [(self.x_to_px(XS[0]), self.y_to_px(0.0))]
        points.extend((self.x_to_px(x), self.y_to_px(y)) for x, y in zip(XS, product))
        points.append((self.x_to_px(XS[-1]), self.y_to_px(0.0)))
        pygame.draw.polygon(self.screen, (70, 110, 255, 60), points)

    def draw_side_panel(self, state: dict[str, float | list[float]]) -> None:
        pygame.draw.rect(self.screen, PANEL, self.side_rect, border_radius=16)
        pygame.draw.rect(self.screen, (50, 62, 85), self.side_rect, 2, border_radius=16)

        y = self.side_rect.top + 20
        header = self.body_font.render("Sampling Monitor", True, TEXT)
        self.screen.blit(header, (self.side_rect.left + 18, y))
        y += 40

        lines = [
            f"a = {self.center:+.4f}",
            f"epsilon = {self.epsilon:.4f}",
            f"f(a) = {fmt_signed(state['exact'])}",
            f"integral = {fmt_signed(state['integral'])}",
            f"|error| = {state['error']:.6f}",
            f"area(delta_eps) = {state['area']:.6f}",
            f"peak height = {state['peak']:.4f}",
        ]
        for line in lines:
            surf = self.mono_font.render(line, True, TEXT)
            self.screen.blit(surf, (self.side_rect.left + 18, y))
            y += 34

        y += 10
        explanation = [
            "Use the Gaussian as a delta-sequence.",
            "As epsilon shrinks, the yellow kernel",
            "gets taller and narrower while its area",
            "stays near 1. The blue overlap integral",
            "tracks the exact sampled value f(a).",
        ]
        for line in explanation:
            surf = self.small_font.render(line, True, MUTED)
            self.screen.blit(surf, (self.side_rect.left + 18, y))
            y += 24

        bar_x = self.side_rect.left + 18
        bar_y = y + 18
        bar_w = self.side_rect.width - 36
        pygame.draw.rect(self.screen, GRID, (bar_x, bar_y, bar_w, 16), border_radius=8)
        normalized = clamp(float(state["error"]) / 0.4, 0.0, 1.0)
        fill_w = int((1.0 - normalized) * bar_w)
        pygame.draw.rect(self.screen, MATCH if normalized < 0.15 else ACCENT, (bar_x, bar_y, fill_w, 16), border_radius=8)
        label = self.small_font.render("Convergence meter", True, MUTED)
        self.screen.blit(label, (bar_x, bar_y - 24))

    def draw_bottom_panel(self) -> None:
        pygame.draw.rect(self.screen, PANEL, self.bottom_rect, border_radius=16)
        pygame.draw.rect(self.screen, (50, 62, 85), self.bottom_rect, 2, border_radius=16)

        title = self.body_font.render(self.current_spec.name, True, self.current_spec.color)
        expr = self.mono_font.render(self.current_spec.expression, True, TEXT)
        self.screen.blit(title, (self.bottom_rect.left + 18, self.bottom_rect.top + 16))
        self.screen.blit(expr, (self.bottom_rect.left + 18, self.bottom_rect.top + 52))

        if self.show_help:
            controls = (
                "Controls: Left/Right move a   Up/Down change epsilon   "
                "1-4 function   Space autoplay   R reset   H help   Esc quit"
            )
            controls_surf = self.small_font.render(controls, True, MUTED)
            self.screen.blit(controls_surf, (self.bottom_rect.left + 18, self.bottom_rect.top + 96))
        else:
            controls_surf = self.small_font.render("Press H to show controls", True, MUTED)
            self.screen.blit(controls_surf, (self.bottom_rect.left + 18, self.bottom_rect.top + 96))

    def draw_title(self) -> None:
        title = self.title_font.render("Dirac Delta Game", True, TEXT)
        subtitle = self.small_font.render(
            "A delta function is useful because it samples. Move the kernel and watch the integral become f(a).",
            True,
            MUTED,
        )
        self.screen.blit(title, (LEFT_PAD, 18))
        self.screen.blit(subtitle, (LEFT_PAD, 52))

    def update(self, dt: float) -> None:
        if self.autoplay:
            self.time_accum += dt
            span = DOMAIN_MAX - DOMAIN_MIN
            speed = 0.7
            self.center = DOMAIN_MIN + (0.5 * (1.0 + math.sin(speed * self.time_accum)) * span)

    def reset(self) -> None:
        self.center = 0.0
        self.epsilon = 0.55
        self.autoplay = False

    def handle_key(self, key: int) -> None:
        if key == pygame.K_LEFT:
            self.center -= 0.08
        elif key == pygame.K_RIGHT:
            self.center += 0.08
        elif key == pygame.K_UP:
            self.epsilon *= 0.90
        elif key == pygame.K_DOWN:
            self.epsilon *= 1.12
        elif key == pygame.K_1:
            self.func_index = 0
        elif key == pygame.K_2:
            self.func_index = 1
        elif key == pygame.K_3:
            self.func_index = 2
        elif key == pygame.K_4:
            self.func_index = 3
        elif key == pygame.K_SPACE:
            self.autoplay = not self.autoplay
        elif key == pygame.K_r:
            self.reset()
        elif key == pygame.K_h:
            self.show_help = not self.show_help

        self.center = clamp(self.center, DOMAIN_MIN, DOMAIN_MAX)
        self.epsilon = clamp(self.epsilon, 0.035, 1.25)

    def draw(self) -> None:
        self.screen.fill(BG)
        self.draw_title()

        state = self.compute_state()
        self.draw_grid()
        self.draw_shaded_product(state["product"])  # type: ignore[arg-type]
        self.draw_curve(XS, state["values"], self.current_spec.color, 3)  # type: ignore[arg-type]
        self.draw_curve(XS, state["gauss"], GAUSS, 3)  # type: ignore[arg-type]

        center_px = self.x_to_px(self.center)
        pygame.draw.line(
            self.screen,
            ACCENT,
            (center_px, self.plot_rect.top),
            (center_px, self.plot_rect.bottom),
            2,
        )

        sample_y = self.current_spec.fn(self.center)
        pygame.draw.circle(self.screen, MATCH, (center_px, self.y_to_px(sample_y)), 7)

        legend_items = [
            (self.current_spec.color, "test function f(x)"),
            (GAUSS, "delta-sequence delta_epsilon(x-a)"),
            ((90, 120, 255), "overlap f(x) delta_epsilon"),
            (MATCH, "exact sampled point f(a)"),
        ]
        legend_x = self.plot_rect.left + 12
        legend_y = self.plot_rect.top + 12
        for color, label in legend_items:
            pygame.draw.rect(self.screen, color, (legend_x, legend_y + 4, 18, 12), border_radius=4)
            surf = self.small_font.render(label, True, MUTED)
            self.screen.blit(surf, (legend_x + 28, legend_y))
            legend_y += 24

        self.draw_side_panel(state)
        self.draw_bottom_panel()
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
    game = DiracDeltaGame()
    game.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
