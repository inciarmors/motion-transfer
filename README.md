# Motion Transfer Studio

Uno studio locale, gratuito e indipendente per sperimentare motion transfer con API proprie. Include un'analisi del frontend pubblico di Genjutsu e un harness Wan 3.0 trasparente da confrontare con il servizio originale.

**Non è una replica del modello Genjutsu. Non è stato dimostrato che Genjutsu usi Wan 3.0.** Leggi [evidenze e limiti](docs/research.md) prima di interpretare i risultati.

## Avvio

Node.js 22.15+ (consigliato Node 24), npm.

```sh
npm ci
cp .env.example .env
# Inserisci nel file .env soltanto le chiavi dei provider che vuoi usare.
npm start
```

Apri **http://127.0.0.1:3210**. L'interfaccia e l'anteprima del payload funzionano anche senza chiavi; la generazione si abilita quando è configurato il relativo provider. Configurato significa chiave presente, non account/bilancio verificati.

## Motori

| Motore | Configurazione | Funzione |
| --- | --- | --- |
| Wan 3.0 diretto | `DASHSCOPE_API_KEY`, `ALIBABA_API_BASE` | Baseline raw o harness originale; riferimenti video ≤15s. |
| Genjutsu ufficiale | `HF_CREDENTIALS=ID:SECRET` | API pubblica Higgsfield, 1–8 immagini. |
| Kling 2.6 Pro | `FAL_KEY` | Motion control con una immagine. |
| Wan Animate Move / Replace | `FAL_KEY` | Animazione o sostituzione di un personaggio. |
| API propria | `CUSTOM_API_URL`, eventuale `CUSTOM_API_KEY` | [Contratto del servizio](docs/custom-provider.md). |

Per Alibaba, `ALIBABA_API_BASE` è l'origine HTTPS del tuo workspace, ad esempio `https://WORKSPACE.eu-central-1.maas.aliyuncs.com`. Usa regione, chiave e modello compatibili come indicato nella [documentazione ufficiale](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference). Non usare il dominio generico di un altro provider.

Le integrazioni cloud sono a pagamento secondo il proprio account. Il software non impone un abbonamento. Non contiene pesi né un motore di inferenza locale.

## Uso

1. Scegli il motore e inserisci URL HTTPS scaricabili di un video e dei riferimenti. Per i motori fal puoi caricare direttamente MP4, PNG, JPEG o WebP: i file vengono trasferiti a fal. Per altri motori usa il tuo storage.
2. Imposta la durata reale della sorgente e la risoluzione. L'app prova a leggere la durata nel browser; il provider deve comunque validare i media remoti.
3. Con Wan 3.0, confronta `Baseline` e un harness. **Ispeziona la richiesta** mostra il prompt effettivo prima dell'invio.
4. Genera e segui la richiesta nello storico. Seleziona una sessione per vedere sorgente e risultato. Salva gli output prima che gli URL del provider scadano.

Il browser aggiorna i job attivi quando la pagina è aperta. Chiuderla non annulla il lavoro sul provider. Lo storico e gli ID persistono in `.data/jobs.json`; riaprendo l'app il polling riprende. Nessun reinvio automatico di generazioni. Un invio dall'esito ambiguo viene marcato `submission_unknown`: controlla il dashboard del provider prima di creare un nuovo job. Non eseguire due processi sulla stessa `.data/`.

## Privacy e repository pubblica

- Credenziali solo nel server tramite `.env`; nessuna chiave nel bundle browser.
- Server vincolato a loopback, controllo Host/Origin e nessun CORS pubblico. È un'app personale locale, non un servizio multiutente da esporre su Internet.
- `.env`, storico, media, log, HAR e catture sono esclusi da Git. Lo storico contiene prompt e URL potenzialmente privati: non condividerlo.
- Nessun bundle proprietario, cookie, token di sessione o media Higgsfield è incluso.
- Le anteprime caricano i media nel browser, gli upload fal usano storage esterno. URL firmati possono dare accesso ai file a chi li possiede.
- `npm run check:public` controlla **il contenuto nell'indice Git**, non soltanto i file nel working tree. È un controllo euristico, da accompagnare a revisione del diff.

## Verifica

```sh
npm run check
npm run check:public
```

Test automatici: validazione, mapping dei provider, ciclo di vita simulato, deduplicazione, recupero dopo interruzione e confini HTTP. **Non sono state effettuate generazioni live né misurazioni di equivalenza visiva.** [Protocollo del benchmark](docs/benchmark.md).

## Struttura

- `src/domain.js`: capacità, validazione e template di prompt originali.
- `src/providers.js`: adapter HTTP e upload tramite client ufficiale fal.
- `src/server.js`, `src/store.js`: API locale e storico persistente.
- `public/`: interfaccia senza framework o build.
- `docs/research.md`: evidenze riproducibili, hash e offset dei bundle pubblici osservati.

## Fonti dei contratti

[Genjutsu API](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference) · [Wan 3.0 API](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference) · [Kling su fal](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control/api) · [Wan Move](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/move/api) · [Wan Replace](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace/api) · [fal Queue](https://fal.ai/docs/documentation/model-apis/inference/queue).

MIT per il codice originale. Modelli, API e marchi mantengono i rispettivi termini. Progetto non affiliato a Higgsfield, Alibaba, Kling o fal.
