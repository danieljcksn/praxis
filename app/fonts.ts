import localFont from "next/font/local";

export const tiemposText = localFont({
  src: [
    {
      path: "./fonts/tiempos/TestTiemposText-Regular-BF66457a50cd521.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-RegularItalic-BF66457a50421c2.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-Medium-BF66457a508489a.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-MediumItalic-BF66457a508d6d9.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-Semibold-BF66457a4fed201.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-SemiboldItalic-BF66457a505477c.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-Bold-BF66457a4f03c40.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposText-BoldItalic-BF66457a50155b4.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-tiempos-text",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const tiemposHeadline = localFont({
  src: [
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Light-BF66457a50df5a0.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-LightItalic-BF66457a5088153.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Regular-BF66457a508e31a.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-RegularItalic-BF66457a5091d70.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Medium-BF66457a509b4ec.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-MediumItalic-BF66457a50b4260.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Semibold-BF66457a509040b.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-SemiboldItalic-BF66457a510c462.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Bold-BF66457a5113d17.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-BoldItalic-BF66457a5072af7.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-Black-BF66457a50e385b.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposHeadline-BlackItalic-BF66457a505495d.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-tiempos-headline",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  preload: false,
});

export const tiemposFine = localFont({
  src: [
    {
      path: "./fonts/tiempos/TestTiemposFine-Light-BF66457a5102792.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-LightItalic-BF66457a50eb132.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-Regular-BF66457a50e8bc9.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-RegularItalic-BF66457a50e36f9.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-Medium-BF66457a50e62cd.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-MediumItalic-BF66457a511be83.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-Semibold-BF66457a50f016a.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-SemiboldItalic-BF66457a50b0e18.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-Bold-BF66457a510211b.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-BoldItalic-BF66457a50b8568.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-Black-BF66457a508fe8f.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/tiempos/TestTiemposFine-BlackItalic-BF66457a510424a.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-tiempos-fine",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  preload: false,
});
