import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import MapView from "./components/mapView";

function MuseumPage() {
  // useParams estrae il valore dinamico :museumId dall'URL
  const { visitId } = useParams(); 

  // Passiamo il museumId scaricato dall'URL direttamente a MapView
  return <MapView visitId={visitId} />;
}

export default function App() {
  return (
    <BrowserRouter basename="/navigator">
      <Routes>
        {/* React riconosce il parametro :museumId direttamente dall'URL */}
        <Route path="/visits/:visitId" element={<MuseumPage />} />
      </Routes>
    </BrowserRouter>
  );
}
