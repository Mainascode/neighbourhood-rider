import "../index.css"; // Import global styles
import { Providers } from "./providers";

export const metadata = {
    title: "Neighborhood Rider",
    description: "Cyclist wako wa mtaa. Fast & Reliable delivery.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
