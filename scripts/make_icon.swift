import AppKit
import Foundation
let path = "Routine/Assets.xcassets/AppIcon.appiconset"
try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: true)
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(calibratedRed: 0.976, green: 0.931, blue: 0.949, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1024, height: 1024)).fill()
for angle in stride(from: 0.0, to: 360.0, by: 60.0) {
    NSGraphicsContext.saveGraphicsState()
    let transform = NSAffineTransform()
    transform.translateX(by: 512, yBy: 512)
    transform.rotate(byDegrees: CGFloat(angle))
    transform.concat()
    NSColor(calibratedRed: 0.72, green: 0.44, blue: 0.56, alpha: 0.82).setFill()
    NSBezierPath(ovalIn: NSRect(x: -67, y: 12, width: 134, height: 235)).fill()
    NSGraphicsContext.restoreGraphicsState()
}
NSColor(calibratedRed: 0.99, green: 0.97, blue: 0.90, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 446, y: 446, width: 132, height: 132)).fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
let png = bitmap.representation(using: .png, properties: [:])!
try png.write(to: URL(fileURLWithPath: path + "/icon.png"))
try """
{"images":[{"filename":"icon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}
""".write(toFile: path + "/Contents.json", atomically: true, encoding: .utf8)