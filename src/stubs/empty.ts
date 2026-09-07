/**
 * Empty stand-in for jsPDF's optional dependencies (html2canvas, canvg, dompurify).
 *
 * Those are only needed by jsPDF's `html()` / canvas-rendering paths, which this app
 * never uses — the medical report is drawn with text and vector primitives only.
 * Aliasing them here keeps ~376 kB of dead code out of the build.
 */
export default {}
