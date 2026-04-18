import Foundation
import PDFKit

if CommandLine.arguments.count < 2 {
    fputs("usage: extract_pdf_text.swift <pdf-path>\n", stderr)
    exit(1)
}

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)

guard let document = PDFDocument(url: url) else {
    fputs("failed to open pdf: \(path)\n", stderr)
    exit(2)
}

var pages: [[String: Any]] = []

for pageIndex in 0..<document.pageCount {
    guard let page = document.page(at: pageIndex) else { continue }
    let text = page.string ?? ""
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { continue }
    pages.append([
        "page": pageIndex + 1,
        "text": trimmed
    ])
}

do {
    let data = try JSONSerialization.data(withJSONObject: pages, options: [])
    FileHandle.standardOutput.write(data)
} catch {
    fputs("failed to encode pdf page json\n", stderr)
    exit(3)
}
