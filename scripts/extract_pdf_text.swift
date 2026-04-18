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

let text = document.string ?? ""
FileHandle.standardOutput.write(Data(text.utf8))
