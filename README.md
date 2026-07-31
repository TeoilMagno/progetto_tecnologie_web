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
