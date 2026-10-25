# KVC Booischot — Voetbaldenken (technische proef)

Eén Nederlandstalige 5-tegen-5-beslissingsoefening voor U9. Dit is een zelfstandig gemaakte proef op basis van het beschreven spelprincipe; de code, vormgeving, figuren, animaties en pictogrammen zijn nieuw gemaakt. Er zijn geen Academy Parent-bestanden of externe beeldassets opgenomen.

## Lokaal openen

Vereist Node.js 20.19+ of 22.12+.

1. Pak de ZIP uit.
2. Open een terminal in deze map.
3. Voer `npm install` uit.
4. Voer `npm run dev` uit.
5. Open de getoonde URL, meestal `http://localhost:5173`.

Om op een telefoon te proberen: voer `npm run dev -- --host 0.0.0.0` uit en open vanaf hetzelfde wifinetwerk `http://IP-ADRES-VAN-DE-COMPUTER:5173`. Dit ontwikkeladres is geen publieke link.

## Productiebuild en PWA

- `npm run build` maakt de productieversie in `dist/`.
- `npm run preview` serveert die productieversie lokaal.
- Een service worker en manifest zijn opgenomen. Voor installatie als PWA is een beveiligde HTTPS-host nodig (localhost is de lokale uitzondering). De service worker kan de app-shell en geladen assets cachen voor later offline gebruik.
- Er is geen account, backend, betaalde API, ranglijst of analyse toegevoegd.

## Inhoud en interactie

- De kijkfase start met balbezit bij LF (11); spelers bewegen en de bal wordt naar C (4) gespeeld.
- Daarna verschijnen A/B/C en een timer van acht seconden.
- A speelt naar RF (7); B speelt centraal en laat een verdediger zichtbaar de passbaan kruisen en de bal onderscheppen; C speelt terug naar LF (11).
- Elke keuze heeft een eigen geanimeerd gevolg en feedback.
- Keuzes leveren 20, 50 of 100 spelpunten op; de totaalscore loopt door over de twee oefeningen.
- “Bekijk situatie opnieuw” toont de kijkfase; “Probeer opnieuw” begint de oefening opnieuw.

De spelers, bal, veld en app-iconen zijn eigen vector-/canvasvormen. Phaser 4.2.1 is MIT-gelicentieerd; Vite is alleen een ontwikkel-/buildhulpmiddel en is eveneens MIT-gelicentieerd. Zie `THIRD-PARTY-NOTICES.md`.

## Status van tests

De productiebuild is lokaal succesvol gemaakt. Deze uitvoeromgeving kon de lokale server niet vanuit een browser openen en bevat geen beschikbare browserbinary. Daarom zijn de drie keuzes, aanraakbediening, PWA-installatie, kleine schermen en Android-prestaties nog niet end-to-end op een echt browser/device getest. Controleer ze eerst lokaal met de instructies hierboven.

