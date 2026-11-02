# Confrontare l'ipotesi Wan 3.0

Stato: protocollo predisposto; **nessun risultato generativo misurato**.

Usare clip e immagini proprie, con permesso di condividerle con ciascun provider. Non aggiungere i media, URL firmati, prompt privati o output al repository pubblico.

## Set minimo

Tre clip da 6–10 secondi: una persona a camera fissa; una persona con rotazione della camera e occlusione; due persone che interagiscono. Una quarta clip da 20–30 secondi può esplorare Genjutsu, ma è fuori dai limiti del nostro adapter Wan 3.0 e non è un confronto diretto.

Per ogni clip tenere identici risoluzione, istruzioni creative, personaggio di riferimento e fonte. Usare 3 repliche per condizione: 27 generazioni per 3 clip × 3 condizioni × 3 repliche. Concordare il budget prima di eseguirle; non sono lanciate automaticamente.

## Condizioni

1. Genjutsu API ufficiale, prompt creativo breve.
2. Wan 3.0 diretto, recipe `raw`, stesso intento espresso con `Video 1` e `Image 1`.
3. Wan 3.0 diretto, recipe `motion-transfer` o `character-replace`, stesso intento aggiuntivo.

Salvare il payload mostrato da **Ispeziona la richiesta** in una cartella locale esclusa da Git. Non aggiungere un passaggio di descrizione visiva, upscaling o face swap finché non è stata misurata la baseline: cambiare più fattori insieme impedisce di attribuire i miglioramenti.

## Valutazione

Assegnare nomi casuali A/B/C alle uscite prima della valutazione. Separare le seguenti misure:

- Timing: errore in frame per eventi riconoscibili (contatto, passo, rotazione, gesto), corretto per FPS.
- Movimento: confronto delle traiettorie e delle pose, includendo fallimenti del rilevatore.
- Camera: direzione e velocità apparente dello sfondo; non confonderle con il movimento del soggetto.
- Identità: continuità del personaggio e degli abiti, specie dopo occlusioni.
- Interazioni: contatto tra mani, oggetti e altri soggetti; assegnazione corretta dei ruoli.
- Preservazione: per replacement, cambiamenti indesiderati allo sfondo e agli altri soggetti.
- Durata, audio, tagli, flicker, tempo di completamento e costo effettivo.

Non usare SSIM/PSNR come unica metrica: un recasting corretto cambia intenzionalmente molti pixel. Riportare mediana, dispersione e singoli fallimenti; non selezionare soltanto l'output migliore. I risultati possono sostenere un'approssimazione pratica, non identificare univocamente la pipeline di Higgsfield.

## Registro locale suggerito

Campi: ID prova, hash dei file input, provider, recipe, hash/versione del prompt, risoluzione, durata, request ID, orario, costo, percorso output, timing error, camera score, identity score, interaction score, note. Conservare questo registro nella cartella `.data/` esclusa da Git.

Per arrivare a una qualità migliore, modificare una sola componente alla volta e ripetere il set: prompt, preparazione dell'immagine, ruolo dei riferimenti, modello. Il progetto non chiama questi template “Genjutsu recovered”: sono implementazioni originali da verificare.
