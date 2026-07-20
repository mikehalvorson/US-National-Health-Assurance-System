# Minimal static file server for local preview of docs/ (no Node/Python needed)
param([int]$Port = 8517)

$root = (Join-Path $PSScriptRoot "..\docs" | Resolve-Path).Path
$rootPrefix = $root.TrimEnd("\") + "\"
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object IO.StreamReader(
      $stream, [Text.Encoding]::ASCII, $false, 1024, $true)
    $request = $reader.ReadLine()
    while (($line = $reader.ReadLine()) -ne $null -and $line -ne "") { }

    $target = if ($request -match "^GET\s+([^\s]+)") { $Matches[1] } else { "/" }
    $urlPath = ([Uri]::new("http://localhost$target")).AbsolutePath
    if ($urlPath -eq "/") { $urlPath = "/index.html" }
    $relative = [Uri]::UnescapeDataString($urlPath).TrimStart("/").Replace("/", "\")
    $file = [IO.Path]::GetFullPath((Join-Path $root $relative))

    if ($file.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -and
        [IO.File]::Exists($file)) {
      $body = [IO.File]::ReadAllBytes($file)
      $extension = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($extension)) {
        $mime[$extension]
      } else {
        "application/octet-stream"
      }
      $status = "200 OK"
    } else {
      $body = [Text.Encoding]::UTF8.GetBytes("404")
      $contentType = "text/plain; charset=utf-8"
      $status = "404 Not Found"
    }

    $headers = [Text.Encoding]::ASCII.GetBytes(
      "HTTP/1.1 $status`r`nContent-Type: $contentType`r`n" +
      "Content-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
    $stream.Write($headers, 0, $headers.Length)
    $stream.Write($body, 0, $body.Length)
  } catch {
    # Keep the preview alive after a malformed or prematurely closed request.
  } finally {
    $client.Close()
  }
}
