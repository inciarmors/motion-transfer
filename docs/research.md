# Genjutsu: evidenze, ipotesi e confine del reverse engineering

Analisi del 2 novembre 2026. **Non abbiamo dimostrato che Genjutsu sia Wan 3.0, né recuperato la pipeline generativa del server.** Questa repository implementa un laboratorio indipendente; non promette una replica perfetta.

## Risposta all'ipotesi «l'harness è un prompt?»

Un harness può includere prompt, selezione del modello, trasformazione degli input, segmentazione temporale, condizionamento, gestione dei riferimenti e postproduzione. Quali di questi passaggi esistano in Genjutsu sul server resta sconosciuto. Confondere il contratto HTTP con l'algoritmo generativo produrrebbe una falsa conclusione.

Nel percorso frontend tracciato non emerge un prompt segreto aggiunto al testo dell'utente. Il prompt viene normalizzato e mandato al backend, che può ancora trasformarlo. L'assenza di un template nel browser **non prova** l'assenza di prompting server-side.

## Osservazioni statiche riproducibili

Pagina osservata senza login: [Genjutsu](https://higgsfield.ai/ai/video?model=genjutsu).

| Evidenza | Risultato osservato |
| --- | --- |
| Routing | Genjutsu: `hf_mult_motion_control`; Wan: `wan3_0` e `wan3_0_prime`. Identificatori distinti non escludono un backend comune. |
| Media | Ruoli `image`, `video`, `location`, trasmessi come identificatori di asset. |
| Validazione | Un video, 4–30 secondi, 1–30 riferimenti inclusa al massimo una location; niente ID duplicati. |
| Scena | `off`, `character`, `video`, `location`; riferimento personaggio opzionale e coerente con la modalità. |
| Parametri | Risoluzione, batch 1–4, aspect ratio, dimensioni, folder e prompt. |
| Normalizzazione | Spazi del prompt rimossi; vuoto diventa null. `scene_mode: video` viene omesso dal serializer finale. |
| Invio | La funzione comune costruisce un POST `/jobs/v2/{jobType}`. Non è stata chiamata. |
| Restyle | Percorso distinto con `preset_id`; non dimostra quale modello esegua il rendering. |

Sorgenti pubbliche analizzate, **non redistribuite**:

- [Core bundle](https://assets.higgsfield.ai/tanstack/assets/187ac5b1-CsNFsHQjAyoxUa1A.js), SHA-256 `d500c41e73f1c3958df75ca2b3356f62ad2a515c1da5d649760fa01da5002137`.
- [State bundle](https://assets.higgsfield.ai/tanstack/assets/187ac5b1-cUratvvlwKoBb8PH.js), SHA-256 `c765adf15d4dc864f495c13fdb373b8afc53484a29429124617f0dc4297c9012`.

Offset byte UTF-8, base zero, nel core: `l$` (builder) 510747; `l0` (serializer) 538110; `h0` (validazione) 539444; `d2` (submit) 557938; `o1` (trasporto) 523200. Nello state: `_M` (default del form) 225401. I nomi minificati sono validi solo per questi hash.

## Cosa dicono le API ufficiali

[Genjutsu Motion Transfer](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference) espone `video_url`, `image_urls`, `prompt` e `resolution`. Il limite pubblico è 1–8 immagini, diverso dal frontend web. Il client implementato usa questa API documentata; non riutilizza sessioni o endpoint privati del sito.

[Wan 3.0, Alibaba](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference) accetta riferimenti video e immagini con istruzioni di editing. I video di riferimento totalizzano al massimo 15 secondi; l'output arriva fino a 30 e input più output devono restare entro 30. Le istruzioni possono nominare `Video 1` e `Image 1`. Il nostro adapter usa `ratio: adaptive`, `duration: -1` e disabilita l'espansione automatica del prompt per rendere confrontabili le prove. Questi parametri **non sono stati estratti da Genjutsu**.

La differenza 15/30 secondi indebolisce l'ipotesi di un semplice inoltro indistinto all'API pubblica Wan. Non esclude chunking, API partner differenti, altri modelli o limiti commerciali diversi. Non è una prova dell'architettura sottostante.

## Ipotesi da mantenere separate

| Ipotesi | Stato | Come verificarla meglio |
| --- | --- | --- |
| Wan 3.0 + istruzioni di editing | Plausibile, non dimostrata | Confronto controllato con baseline raw e prompt strutturato. |
| Wan + preprocessing o più passaggi | Possibile | Cercare cambiamenti alle transizioni, continuità su clip lunghe e relazioni con la durata. |
| Modello diverso o specializzato | Possibile | Confrontare fallimenti sistematici, preservazione della camera e interazioni tra più soggetti. |
| Un prompt nel JavaScript basta a clonarlo | Non supportata dal percorso analizzato | Nessun template nascosto osservato in quel percorso. |

Latenza, prezzo, similarità visiva o nomi delle route, isolatamente, non identificano un modello. Anche risultati molto simili non provano pesi o pipeline identici.

## Perché non è stato necessario REA

[REA](https://github.com/morluto/rea) può organizzare ispezione JavaScript, osservazioni browser e catture. Per questo passaggio sono bastati lettura dei bundle pubblici e tracciamento statico. REA non rende disponibile il codice eseguito su un server remoto. Non è stato installato e nessuna configurazione dell'utente è stata modificata.

## Limiti di questa verifica

Nessun accesso al backend, ai pesi o a prompt interni. Nessuna cattura di traffico autenticato. Nessuna generazione reale o spesa. I test verificano contratti e comportamento del software con risposte simulate, non qualità o disponibilità degli account dei provider. L'equivalenza visiva resta da misurare con [il protocollo di confronto](benchmark.md).
