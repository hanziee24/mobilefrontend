const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const expoCameraRoot = path.join(projectRoot, 'node_modules', 'expo-camera', 'android');

const files = new Map([
  [
    path.join(expoCameraRoot, 'src', 'main', 'java', 'expo', 'modules', 'interfaces', 'barcodescanner', 'BarCodeScannerResult.kt'),
    `package expo.modules.interfaces.barcodescanner

data class BarCodeScannerResult(
  val type: Int,
  val value: String?,
  val raw: String?,
  var cornerPoints: List<Int>,
  var referenceImageHeight: Int,
  var referenceImageWidth: Int,
  var boundingBox: BoundingBox = BoundingBox(0, 0, 0, 0)
) {
  data class BoundingBox(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int
  )
}
`
  ],
  [
    path.join(expoCameraRoot, 'src', 'main', 'java', 'expo', 'modules', 'interfaces', 'barcodescanner', 'BarCodeScannerInterface.kt'),
    `package expo.modules.interfaces.barcodescanner

interface BarCodeScannerInterface {
  fun setSettings(settings: BarCodeScannerSettings)
  fun scan(imageData: ByteArray, width: Int, height: Int, rotation: Int): BarCodeScannerResult?
}
`
  ],
  [
    path.join(expoCameraRoot, 'src', 'main', 'java', 'expo', 'modules', 'interfaces', 'barcodescanner', 'BarCodeScannerProviderInterface.kt'),
    `package expo.modules.interfaces.barcodescanner

import android.content.Context

interface BarCodeScannerProviderInterface {
  fun createBarCodeDetectorWithContext(context: Context): BarCodeScannerInterface?
}
`
  ],
  [
    path.join(expoCameraRoot, 'src', 'main', 'java', 'expo', 'modules', 'interfaces', 'barcodescanner', 'BarCodeScannerSettings.kt'),
    `package expo.modules.interfaces.barcodescanner

class BarCodeScannerSettings(
  val settings: Map<String, Any?> = emptyMap()
)
`
  ],
  [
    path.join(expoCameraRoot, 'maven', 'com', 'google', 'android', 'cameraview', '1.0.0', 'cameraview-1.0.0.pom'),
    `<?xml version="1.0" encoding="UTF-8"?>
<project xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd" xmlns="http://maven.apache.org/POM/4.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.google.android</groupId>
  <artifactId>cameraview</artifactId>
  <version>1.0.0</version>
  <packaging>aar</packaging>
  <dependencies>
    <dependency>
      <groupId>androidx.annotation</groupId>
      <artifactId>annotation</artifactId>
      <version>1.9.1</version>
      <scope>compile</scope>
    </dependency>
    <dependency>
      <groupId>androidx.core</groupId>
      <artifactId>core</artifactId>
      <version>1.16.0</version>
      <scope>compile</scope>
    </dependency>
    <dependency>
      <groupId>androidx.appcompat</groupId>
      <artifactId>appcompat</artifactId>
      <version>1.7.0</version>
      <scope>compile</scope>
    </dependency>
  </dependencies>
</project>
`
  ]
]);

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

for (const [filePath, contents] of files) {
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === contents) {
      continue;
    }
  }

  ensureParentDir(filePath);
  fs.writeFileSync(filePath, contents);
  console.log(`patched ${path.relative(projectRoot, filePath)}`);
}
