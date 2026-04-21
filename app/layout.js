import './globals.css';

export const metadata = {
  title: 'Mon Herbier',
  description: 'Votre herbier botanique personnel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
