export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface ProcessedImage {
  canvas: HTMLCanvasElement;
  detectedRectangle?: Rectangle;
  confidence: number;
}

/**
 * Convert image to grayscale for edge detection
 */
function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  const grayscaleData = new ImageData(imageData.width, imageData.height);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayscaleData.data[i] = gray;     // R
    grayscaleData.data[i + 1] = gray; // G
    grayscaleData.data[i + 2] = gray; // B
    grayscaleData.data[i + 3] = data[i + 3]; // A
  }
  
  return grayscaleData;
}

/**
 * Apply Gaussian blur to reduce noise
 */
function gaussianBlur(imageData: ImageData, radius: number = 2): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  
  const kernel = generateGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const pi = (py * width + px) * 4;
          const weight = kernel[ky + halfKernel][kx + halfKernel];
          
          r += data[pi] * weight;
          g += data[pi + 1] * weight;
          b += data[pi + 2] * weight;
          a += data[pi + 3] * weight;
          weightSum += weight;
        }
      }
      
      const outputIndex = (y * width + x) * 4;
      output.data[outputIndex] = r / weightSum;
      output.data[outputIndex + 1] = g / weightSum;
      output.data[outputIndex + 2] = b / weightSum;
      output.data[outputIndex + 3] = a / weightSum;
    }
  }
  
  return output;
}

function generateGaussianKernel(radius: number): number[][] {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  const sigma = radius / 3;
  const norm = 1 / (Math.sqrt(2 * Math.PI) * sigma);
  const coeff = 2 * sigma * sigma;
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    kernel[i] = [];
    for (let j = 0; j < size; j++) {
      const x = i - radius;
      const y = j - radius;
      kernel[i][j] = norm * Math.exp(-(x * x + y * y) / coeff);
      sum += kernel[i][j];
    }
  }
  
  // Normalize
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      kernel[i][j] /= sum;
    }
  }
  
  return kernel;
}

/**
 * Detect edges using Sobel operator
 */
function detectEdges(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let pixelX = 0, pixelY = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pi = ((y + ky) * width + (x + kx)) * 4;
          const intensity = data[pi]; // Using red channel as grayscale
          
          pixelX += sobelX[ky + 1][kx + 1] * intensity;
          pixelY += sobelY[ky + 1][kx + 1] * intensity;
        }
      }
      
      const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
      const outputIndex = (y * width + x) * 4;
      const clampedMagnitude = Math.min(255, magnitude);
      
      output.data[outputIndex] = clampedMagnitude;     // R
      output.data[outputIndex + 1] = clampedMagnitude; // G
      output.data[outputIndex + 2] = clampedMagnitude; // B
      output.data[outputIndex + 3] = 255;              // A
    }
  }
  
  return output;
}

/**
 * Find contours in edge-detected image
 */
function findContours(imageData: ImageData, threshold: number = 128): Point[][] {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const visited = new Array(width * height).fill(false);
  const contours: Point[][] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      
      if (!visited[index] && data[pixelIndex] > threshold) {
        const contour = traceContour(data, width, height, x, y, visited, threshold);
        if (contour.length > 50) { // Filter small contours
          contours.push(contour);
        }
      }
    }
  }
  
  return contours.sort((a, b) => b.length - a.length); // Sort by size
}

function traceContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: boolean[],
  threshold: number
): Point[] {
  const contour: Point[] = [];
  const stack: Point[] = [{ x: startX, y: startY }];
  
  while (stack.length > 0) {
    const point = stack.pop()!;
    const index = point.y * width + point.x;
    
    if (visited[index]) continue;
    visited[index] = true;
    contour.push(point);
    
    // Check 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = point.x + dx;
        const ny = point.y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const neighborIndex = ny * width + nx;
          const pixelIndex = neighborIndex * 4;
          
          if (!visited[neighborIndex] && data[pixelIndex] > threshold) {
            stack.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  
  return contour;
}

/**
 * Approximate contour to polygon using Douglas-Peucker algorithm
 */
function approximatePolygon(contour: Point[], epsilon: number = 2): Point[] {
  if (contour.length < 3) return contour;
  
  return douglasPeucker(contour, epsilon);
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToLine(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function distanceToLine(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return Math.sqrt(A * A + B * B);
  }
  
  const param = dot / lenSq;
  let closestX, closestY;
  
  if (param < 0) {
    closestX = lineStart.x;
    closestY = lineStart.y;
  } else if (param > 1) {
    closestX = lineEnd.x;
    closestY = lineEnd.y;
  } else {
    closestX = lineStart.x + param * C;
    closestY = lineStart.y + param * D;
  }
  
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the best rectangle from detected contours
 */
function findBestRectangle(contours: Point[][], imageWidth: number, imageHeight: number): Rectangle | null {
  for (const contour of contours) {
    const polygon = approximatePolygon(contour, 10);
    
    if (polygon.length === 4) {
      // Check if it's a reasonable rectangle
      const rect = orderRectanglePoints(polygon);
      if (isValidRectangle(rect, imageWidth, imageHeight)) {
        return rect;
      }
    }
  }
  
  return null;
}

function orderRectanglePoints(points: Point[]): Rectangle {
  // Sort points by y-coordinate
  points.sort((a, b) => a.y - b.y);
  
  // Top two points
  const topPoints = points.slice(0, 2).sort((a, b) => a.x - b.x);
  // Bottom two points  
  const bottomPoints = points.slice(2).sort((a, b) => a.x - b.x);
  
  return {
    topLeft: topPoints[0],
    topRight: topPoints[1],
    bottomLeft: bottomPoints[0],
    bottomRight: bottomPoints[1]
  };
}

function isValidRectangle(rect: Rectangle, width: number, height: number): boolean {
  const { topLeft, topRight, bottomLeft, bottomRight } = rect;
  
  // Check if points are within image bounds
  const points = [topLeft, topRight, bottomLeft, bottomRight];
  for (const point of points) {
    if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) {
      return false;
    }
  }
  
  // Check minimum size (at least 20% of image)
  const rectWidth = Math.max(
    distance(topLeft, topRight),
    distance(bottomLeft, bottomRight)
  );
  const rectHeight = Math.max(
    distance(topLeft, bottomLeft),
    distance(topRight, bottomRight)
  );
  
  const minSize = Math.min(width, height) * 0.2;
  return rectWidth > minSize && rectHeight > minSize;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Main function to detect document rectangle in image
 */
export async function detectDocumentRectangle(
  imageElement: HTMLImageElement | HTMLVideoElement
): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Set canvas size
  canvas.width = imageElement instanceof HTMLVideoElement 
    ? imageElement.videoWidth 
    : imageElement.naturalWidth;
  canvas.height = imageElement instanceof HTMLVideoElement 
    ? imageElement.videoHeight 
    : imageElement.naturalHeight;
  
  // Draw image to canvas
  ctx.drawImage(imageElement, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Process image for edge detection
  const grayscale = toGrayscale(imageData);
  const blurred = gaussianBlur(grayscale, 1);
  const edges = detectEdges(blurred);
  
  // Find contours and detect rectangle
  const contours = findContours(edges, 100);
  const rectangle = findBestRectangle(contours, canvas.width, canvas.height);
  
  // Calculate confidence based on detection quality
  const confidence = rectangle ? calculateConfidence(rectangle, canvas.width, canvas.height) : 0;
  
  return {
    canvas,
    detectedRectangle: rectangle || undefined,
    confidence
  };
}

function calculateConfidence(rect: Rectangle, width: number, height: number): number {
  // Base confidence on rectangle size and aspect ratio
  const rectWidth = Math.max(
    distance(rect.topLeft, rect.topRight),
    distance(rect.bottomLeft, rect.bottomRight)
  );
  const rectHeight = Math.max(
    distance(rect.topLeft, rect.bottomLeft),
    distance(rect.topRight, rect.bottomRight)
  );
  
  const aspectRatio = rectWidth / rectHeight;
  const sizeRatio = (rectWidth * rectHeight) / (width * height);
  
  // Prefer rectangular shapes (receipt-like aspect ratios)
  let aspectScore = 0;
  if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
    aspectScore = 1 - Math.abs(aspectRatio - 1.0) / 1.0;
  }
  
  // Prefer larger rectangles
  const sizeScore = Math.min(sizeRatio / 0.8, 1.0);
  
  return (aspectScore * 0.6 + sizeScore * 0.4) * 100;
}

/**
 * Apply perspective correction to crop the detected rectangle
 */
export async function cropToRectangle(
  sourceCanvas: HTMLCanvasElement,
  rectangle: Rectangle,
  outputWidth: number = 800,
  outputHeight: number = 1000
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  // Apply perspective transformation
  const transform = calculatePerspectiveTransform(
    rectangle,
    { width: outputWidth, height: outputHeight }
  );
  
  ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  ctx.drawImage(sourceCanvas, 0, 0);
  
  return canvas;
}

function calculatePerspectiveTransform(
  srcRect: Rectangle,
  dest: { width: number; height: number }
): DOMMatrix {
  // This is a simplified approach - a full perspective transform would use matrix math
  // For now, we'll use a basic transformation
  const srcWidth = distance(srcRect.topLeft, srcRect.topRight);
  const srcHeight = distance(srcRect.topLeft, srcRect.bottomLeft);
  
  const scaleX = dest.width / srcWidth;
  const scaleY = dest.height / srcHeight;
  
  const matrix = new DOMMatrix();
  matrix.translateSelf(-srcRect.topLeft.x, -srcRect.topLeft.y);
  matrix.scaleSelf(scaleX, scaleY);
  
  return matrix;
}