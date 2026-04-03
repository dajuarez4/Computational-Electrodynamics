import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

struct Config {
  let input: URL
  let output: URL
  let start: Double
  let duration: Double
  let fps: Double
  let width: Double
}

func parseArgs() -> Config? {
  let args = Array(CommandLine.arguments.dropFirst())
  var values: [String: String] = [:]
  var index = 0

  while index < args.count {
    let key = args[index]
    if key.hasPrefix("--"), index + 1 < args.count {
      values[key] = args[index + 1]
      index += 2
    } else {
      index += 1
    }
  }

  guard
    let inputPath = values["--input"],
    let outputPath = values["--output"],
    let start = Double(values["--start"] ?? "0"),
    let duration = Double(values["--duration"] ?? "15"),
    let fps = Double(values["--fps"] ?? "8"),
    let width = Double(values["--width"] ?? "320")
  else {
    return nil
  }

  return Config(
    input: URL(fileURLWithPath: inputPath),
    output: URL(fileURLWithPath: outputPath),
    start: start,
    duration: duration,
    fps: fps,
    width: width
  )
}

func usage() {
  print("Usage: swift export_mov_to_gif.swift --input <mov> --output <gif> [--start 0] [--duration 15] [--fps 8] [--width 320]")
}

guard let config = parseArgs() else {
  usage()
  exit(1)
}

let asset = AVURLAsset(url: config.input)
let durationSeconds = CMTimeGetSeconds(asset.duration)
let videoTrack = asset.tracks(withMediaType: .video).first

guard durationSeconds.isFinite, durationSeconds > 0, let track = videoTrack else {
  print("Could not read video metadata.")
  exit(1)
}

let transformedSize = track.naturalSize.applying(track.preferredTransform)
let sourceWidth = Double(abs(transformedSize.width))
let sourceHeight = Double(abs(transformedSize.height))

guard sourceWidth > 0, sourceHeight > 0 else {
  print("Invalid video dimensions.")
  exit(1)
}

let clipStart = max(0, config.start)
let clipEnd = min(durationSeconds, clipStart + max(0.1, config.duration))
let clipDuration = max(0, clipEnd - clipStart)
let frameInterval = 1.0 / max(1.0, config.fps)
let frameCount = max(1, Int((clipDuration / frameInterval).rounded(.down)))
let targetSize = CGSize(width: config.width, height: (config.width / sourceWidth) * sourceHeight)

try? FileManager.default.createDirectory(
  at: config.output.deletingLastPathComponent(),
  withIntermediateDirectories: true
)

guard let destination = CGImageDestinationCreateWithURL(
  config.output as CFURL,
  UTType.gif.identifier as CFString,
  frameCount,
  nil
) else {
  print("Could not create GIF destination.")
  exit(1)
}

let fileProperties: [CFString: Any] = [
  kCGImagePropertyGIFDictionary: [
    kCGImagePropertyGIFLoopCount: 0
  ]
]
CGImageDestinationSetProperties(destination, fileProperties as CFDictionary)

let imageGenerator = AVAssetImageGenerator(asset: asset)
imageGenerator.appliesPreferredTrackTransform = true
imageGenerator.maximumSize = targetSize
imageGenerator.requestedTimeToleranceAfter = .zero
imageGenerator.requestedTimeToleranceBefore = .zero

let frameProperties: [CFString: Any] = [
  kCGImagePropertyGIFDictionary: [
    kCGImagePropertyGIFDelayTime: frameInterval
  ]
]

for frameIndex in 0..<frameCount {
  let seconds = clipStart + (Double(frameIndex) * frameInterval)
  let time = CMTime(seconds: seconds, preferredTimescale: 600)

  do {
    let image = try imageGenerator.copyCGImage(at: time, actualTime: nil)
    CGImageDestinationAddImage(destination, image, frameProperties as CFDictionary)
  } catch {
    print("Skipping frame at \(seconds)s: \(error)")
  }
}

if CGImageDestinationFinalize(destination) {
  print("Saved \(config.output.path)")
  print("clipStart=\(clipStart)")
  print("clipEnd=\(clipEnd)")
  print("fps=\(config.fps)")
  print("width=\(Int(config.width))")
} else {
  print("Failed to write GIF.")
  exit(1)
}
