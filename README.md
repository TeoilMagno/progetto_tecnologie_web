## Repo del progetto di gruppo di tecnologie web per l'anno scolastico 2025/2026
Repo del progetto di gruppo di tecnologie web per l'anno scolastico 2025/2026

#### Cose da fare:
  - possibile schema delle domande da fare:
      - chat stile amazon con le domande prestabilite (facciamo andare solo le domande per ora)
   
Prossime idee:
  - quando il navigator ha finito di leggere per l'opera fa un effetto sonoro sta in ascolto per 5 secondi
      - se non sente niente altro effetto sonoro e smette di ascoltare
      - altrimenti es "vai avanti" e "ok" e va avanti

#### Divisione directory;
  - source/server -> backend
    - js/controllers -> interazioni con mongodb
    - js/models -> modelli mongoose
    - js/routers -> gestione chiamate API
      - apirouter -> gestione dei dati JSON rispondendo alle chiamate fetch
      - router ->  gestione della navigazione dell'utente
  - source/navigato e source/marketplace -> public

#### Per Alex
Ho lasciato le seguenti cose indietro perche' prevalentemente di front-end. Sono tantissime, quindi ovviamente appena finiamo il back-end ce le spartiamo e' solo per dare un'idea di cosa manca:
 - Marketplace
   - rimuovere i vari alert con una diversa gestione dei messaggi es. riquadri nell'html/warning
   - stile pagina 403, magari si puo' fare anche una pagina 404 personalizzata?
   - uniformazione degli stili in giro per il marketplace -> esempio, ho cambiato il form di aggiunta di un museo in modo che rimandi all'edit-museum e cosi' il form e' sempre lo stesso. liberissimo di cambiarlo. se lo tieni add-section.html, add-work.html, add-section.js, add-work.js non servono piu'; erano la precedente versione del form che puoi andare a recuperare da commit passati
   - capire come impostare quello che adesso si chiama bookshop perche' al momento in ogni museo si possono vedere le opere e gli item. per le visite disponibili per quel museo ci sarebbe da andare in esplora visite e filtrare per museo (funzionalita' ancora non disponibile ma che introdurremo). avrebbe piu' senso si potessero vedere in un qualche modo (con tab, menu o altro) opere, item e visite. a quel punto e' anche possibile che esplora visite diventi inutile. c'e' in pratica da capire come impostare bene la visualizzazione di tutte le funzionalita' offerte
   - forse modifica da poco, al momento se si crea/modifica una visita il backend impedisce di inserire due volte la stessa opera, ma oltre al fatto che la si vede elencata nel carrello il frontend non nasconde ad esempio il tasto aggiungi alla visita per metterci un "aggiunto" o simile. sempre riguardo a questa pagina dovevamo caipre come elencare le opere. adesso sono 3 o 4 al massimo, ma se sono tante? per cui si pensava di mostrare in basso a dx la foto della sezione (caricata dal curatore quindi c'e') e poi indicare solo il nome della stanza e le opere in quella stanza. tecnicamente mi ero incaricata io (Alessia) di aggiustare queste cose, ma fammi sapere prima se hai altre idee,se vuoi fare tu ecc
   - probabilmente ultimo dei nostri problemi ma comunque bisogna modificare le icone nel tab della pagina del browser + su console.cloud.google.com (e' quello per l'autenticazione tramite google)
 - Navigator
   - rimane da fare il menu del navigator per il proseguimento della visita; alcune funzionalita' a cui abbiamo pensato sono
     - tasto next/prev
     - deve in un qualche modo consentire di scegliere tra leggere o ascoltare l'audio delle descrizioni e di scrivere o parlare per fare domande
     - dato che nel pdf si parla di tempo rimanente alla fine della visita, abbiamo ipotizzato che il navigator debba suggerire nuove opere, probabilmente in base alle opere nella visita ; per cui si pensava a qualcosa del tipo: quando si arriva all'ultima opera, anziche' terminare la visita e basta, magari fare un tasto che termina la visita e un altro con tipo "continua a visitare", "visita altro" o qualcosa di simile
    
Per un'idea sulle prossime funzionalita' che abbiamo quanto meno pensato di aggiungere c'e' la TODO_list.txt nei branch matteo e alessia.
