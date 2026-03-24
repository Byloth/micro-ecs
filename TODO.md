# Object Pooling - Piano di Implementazione

## Premessa

Questo documento traccia il piano di implementazione dell'object pooling in μECS, aggiornato allo
stato corrente del codebase dopo i primi interventi già completati.

L'object pooling pre-alloca e riutilizza istanze di oggetti anziché crearli e distruggerli
continuamente. In un contesto ECS, dove entità e componenti vengono create e distrutte ad alta
frequenza durante il game loop, questo riduce significativamente la pressione sul garbage
collector, evitando i micro-stutter che possono causare frame drop.

---

## 1. Stato dell'Implementazione

### 1.1. Già Completato

#### Infrastruttura Pool (`src/pool/`)

- **`ObjectPool<T>`** (`src/pool/object-pool.ts`): classe generica con `acquire()`, `release()`,
  `preallocate()`, `clear()`, getter `available`. Limit `maxSize` configurabile (default 256).
  Guard DEV per doppio-release. Esportata pubblicamente in `index.ts`.

- **`Poolable<T>`** (`src/pool/poolable.ts`): interfaccia contratto `initialize(parent: T, ...args)`
  + `dispose()`. Ridisegnata rispetto alla proposta originale che usava `reset()`: il pattern
  `initialize`/`dispose` è più pulito perché l'oggetto ricevuto dal pool è già in stato "vuoto"
  (dal precedente `dispose()`), e `initialize` lo attiva con il contesto necessario. Non è ancora
  esportata pubblicamente.

- **`InitializeArgs<E>`** (`src/pool/poolable.ts`): helper di tipo che estrae i parametri di
  `initialize()` dal secondo in poi (esclude il `parent`). Usato nelle firme di `createEntity()`.
  Non ancora esportato pubblicamente.

#### Entity Pooling (`src/entity.ts`, `src/world.ts`)

- `Entity` implementa `Poolable<W>`. Il costruttore imposta lo stato "vuoto" (`_id = -1`,
  `_world = null`, `_isEnabled = false`). Il metodo `initialize(world, enabled?, ...args)` attiva
  l'entità assegnandole un nuovo ID crescente e collegandola al world. `dispose()` riporta
  l'entità allo stato vuoto (svuota componenti, contesti, dipendenze, azzera i campi).

- Pool globale per-tipo in `world.ts` (non per-World): `_entityPools: Map<EntityType, ObjectPool>`.
  La scelta globale consente il riutilizzo tra World diversi e semplifica la gestione.

- **`world.createEntity<E>(type?, ...args)`**: unico punto di creazione. Acquisisce dal pool
  (o alloca nuova istanza), chiama `initialize()`, registra nel World e abilita se necessario.

- **`world.destroyEntity(entity | id)`**: distrugge, chiama `dispose()`, e rilascia al pool.
  `world.dispose()` fa lo stesso per tutte le entità rimanenti.

- Le API `addEntity()`/`removeEntity()` sono state rimosse. `createEntity()`/`destroyEntity()`
  sono ora l'unica interfaccia pubblica per la gestione delle entità.

#### Note sul Design Attuale

- **ID sempre crescenti**: ogni `initialize()` assegna un nuovo ID via `__μECS_NextId__`.
  Gli ID non vengono riciclati (Opzione A del documento originale: più sicuro, DX-first).
- **Nessun flag `_isAlive`**: il campo `_world` serve da guardia (`null` = entità non attiva).
  Questo copre il caso d'uso principale; un flag esplicito rimane valutabile in futuro.
- **`EntityType<E>` richiede costruttore senza argomenti**: tutta l'inizializzazione avviene
  in `initialize()`, quindi `new type()` è sempre `Constructor<E, []>`.

#### Component Pooling (`src/component.ts`, `src/entity.ts`)

- `Component` implementa `Poolable<E>`. Il costruttore imposta lo stato "vuoto" (`_entity = null`,
  `_isEnabled = true`). `initialize(entity, enabled?)` attiva il componente collegandolo all'entità.
  `dispose()` riporta il componente allo stato vuoto (pulisce `_entity`, ripristina `_isEnabled = true`).
  `onAttach()`/`onDetach()` rimossi: `initialize()`/`dispose()` sono il nuovo lifecycle.

- Pool globale per-tipo in `entity.ts` (non per-Entity): `_componentPools: Map<ComponentType, ObjectPool>`.
  Stessa scelta architetturale del pool di Entity.

- **`entity.createComponent<C>(type, ...args)`**: unico punto di creazione. Acquisisce dal pool
  (o alloca nuova istanza), chiama `initialize()`, registra nell'Entity e abilita se necessario.

- **`entity.destroyComponent<C>(type | component)`**: distrugge, chiama `dispose()`, e rilascia al pool.
  `entity.dispose()` (chiamata da `world.destroyEntity`) fa lo stesso per tutti i componenti residui.

- Le API `addComponent()`/`removeComponent()` sono state rimosse. `createComponent()`/`destroyComponent()`
  sono ora l'unica interfaccia pubblica per la gestione dei componenti su un'entità.

- `Poolable<T>` e `InitializeArgs<E>` ora esportati pubblicamente da `index.ts`.

- `ComponentType<C>` ora richiede costruttore no-arg (`Constructor<C, []>`) per supportare il pool.

---

### 1.2. Allocazioni Ancora da Ottimizzare

| Origine | Allocazione | Frequenza | File |
|---|---|---|---|
| `_gatherComponents()` | `new Array<Component>(N)` | Per ogni match in `findAll()`, `findFirst()`, `getView()` / enable | `query/manager.ts:71` |
| `_createMask()` | `number[]` | Per ogni query non-cached | `query/manager.ts:47-55` |
| Component constructor | Proprietà base | Ogni creazione componente | `component.ts` |

Le allocazioni di `Entity` e delle `Map` interne sono già coperte dal pool di entità.

---

## 2. Lavoro Rimanente

### Fase 2: Pool per Array delle Query (Priorità: Alta)

**Problema**: `_gatherComponents()` alloca un `new Array(N)` per ogni entità che matcha una query.
Chiamata potenzialmente migliaia di volte per frame in `findAll()` non-cached.

#### 2a. Array Scratch per `findAll()` (non-cached)

Il generatore in `findAll()` produce un risultato alla volta. Si può riutilizzare un singolo
"scratch array" sovrascrivendolo a ogni `yield`, eliminando ogni allocazione nel loop.

```typescript
// Comportamento attuale: alloca nuovo array a ogni yield
yield _gatherComponents(entity, types) as R;

// Obiettivo: riutilizzare un array pre-allocato
_fillComponents(scratch, entity, types);
yield scratch as R;
```

**Attenzione - breaking change comportamentale**: i valori yielded diventano volatili tra
un'iterazione e la successiva. Chi accumula i risultati con `.toArray()` o spread `[...]`
funziona correttamente perché copia i valori; chi conserva riferimenti diretti all'array
riceverebbe dati sovrascritti.

Dato che `findAll()` restituisce uno `SmartIterator` (da `@byloth/core`) che già espone
`.toArray()`, questo pattern è supportato nativamente. Da documentare chiaramente.

#### 2b. Array Scratch per `findFirst()` (non-cached)

Stesso approccio: array scratch locale riutilizzabile, dato che si restituisce un singolo
risultato che l'utente dovrebbe leggere immediatamente, non conservare.

**Considerazione**: `findFirst()` è chiamata molto meno frequentemente di `findAll()`.
L'impatto è minore, ma la modifica è banale una volta introdotto il pattern per `findAll()`.

#### 2c. Pool di `Component[]` per `QueryView`

Le `QueryView` conservano gli array di componenti in `_components: C[][]`. Questi array
devono persistere (non possono essere scratch), ma possono essere **poolati**: presi da un
pool quando un'entità viene aggiunta alla view, restituiti al pool quando rimossa.

```
QueryManager tiene un pool di array per-dimensione (1 comp, 2 comp, 3 comp, ...)
_onEntityComponentEnable() → acquire array dal pool
QueryView.delete() → release array al pool
QueryView.clear() → release tutti gli array al pool
```

**Modifiche necessarie**:
- Pool di array (o array di pool, uno per dimensione query) nel `QueryManager`
- `_gatherComponents()` accetta un array da riempire come parametro (invece di allocarlo)
- `QueryView.delete()` riceve un callback di rilascio, oppure `QueryManager` coordina
  direttamente (preferibile: accoppiamento minore per `QueryView`)

#### Cosa serve (Fase 2):

| File | Modifica |
|---|---|
| `src/query/manager.ts` | Array scratch per `findAll()` e `findFirst()`; pool di array per views; refactor `_gatherComponents()` |
| `src/query/view.ts` | `delete()` e `clear()` accettano callback/hook per rilascio array |
| `tests/query/manager.test.ts` | Test per scratch array e comportamento volatile |

---

### Fase 4: Pool per Componenti (Priorità: Media)

**Problema**: i componenti sono oggetti semplici ma creati in massa. Un pool per-tipo consente
di riutilizzarli senza re-allocare.

**Sfida principale**: i componenti contengono dati arbitrari definiti dall'utente (posizione,
velocità, salute, ecc.). Il pool non può sapere come resettare questi dati: serve un pattern
`initialize()` che l'utente implementa nelle sottoclassi.

#### Design Proposto

`Component` implementa `Poolable<Entity>` con lo stesso pattern di `Entity`:

```typescript
class Component<E extends Entity = Entity> implements Poolable<E>
{
    // Costruttore: stato "vuoto" (_isEnabled = true di default, _entity = null)
    public constructor() { ... }

    // Chiamato quando acquisito dal pool e aggiunto all'entità
    // Le sottoclassi overridano per inizializzare i propri dati
    public initialize(entity: E): void
    {
        this._entity = entity;
    }

    // Già esistente: stato "vuoto" per il riciclo
    public dispose(): void { ... }
}
```

Questo **sostituisce** `onAttach()`/`onDetach()` come meccanismo primario di lifecycle,
allineando `Component` al pattern già adottato da `Entity`.

**Decisione da valutare**: mantenere `onAttach()`/`onDetach()` come alias/backward-compat
oppure rimuoverli definitivamente? L'API attuale li usa ancora direttamente in `entity.ts`.
Una migrazione pulita probabilmente richiede la loro rimozione.

#### Integrazione con World/Entity

Pool per-tipo di componenti gestiti a livello di `World` (o globale, come per le Entity):

```typescript
// API proposta:
world.createComponent<C extends Component>(type: ComponentType<C>, entity: Entity, ...args): C
// oppure come shorthand su Entity:
entity.addNewComponent<C extends Component>(type: ComponentType<C>, ...args): C
```

`destroyEntity()` dovrebbe gestire anche il rilascio dei componenti al loro pool
(se i componenti sono poolati), tramite un nuovo metodo `world.releaseComponent()`.

#### Cosa serve (Fase 4):

| File | Modifica |
|---|---|
| `src/component.ts` | Implementare `Poolable<Entity>`; valutare `onAttach`/`onDetach` |
| `src/entity.ts` | Adattare `addComponent()`/`removeComponent()` al nuovo lifecycle |
| `src/world.ts` | Pool per-tipo di componenti; `createComponent()`; aggiornare `destroyEntity()` |
| `src/pool/poolable.ts` | Eventuale aggiornamento se necessario |
| `tests/component.test.ts` | Test per pool di componenti e reset dei dati utente |

---

### Fase 5: Export, Configurazione e Documentazione (Priorità: Bassa)

#### Export Mancanti

`Poolable` e `InitializeArgs` non sono ancora esportati da `index.ts`, ma sono necessari
per chi vuole creare entità e componenti custom con il pool correttamente tipizzato.

```typescript
// Da aggiungere in index.ts:
export type { default as Poolable } from "./pool/poolable.js";
export type { InitializeArgs } from "./pool/poolable.js";
```

#### Configurazione del Pool

Le dimensioni del pool (`maxSize`, pre-allocazione) sono attualmente fisse (default 256).
Potrebbe essere utile rendere configurabile il pool a livello di tipo o di World:

```typescript
// Esempio:
world.configurePool(Entity, { maxSize: 512, preallocate: 64 });
world.configurePool(BulletComponent, { maxSize: 1000 });
```

Questa configurazione è opzionale e ha senso solo quando si conosce il volume atteso
di oggetti per scenario. Non è prioritaria prima di avere il pool di componenti funzionante.

#### Cosa serve (Fase 5):

| File | Modifica |
|---|---|
| `src/index.ts` | Export `Poolable`, `InitializeArgs` |
| `src/world.ts` | API opzionale `configurePool()` |

---

## 3. Decisioni Aperte

### 3.1. Array Scratch vs. Copia in `findAll()`

La proposta attuale (array scratch volatile) è la più performante e standard (equivalente
al comportamento di iteratori ECS in C++/Rust). Alternativa: pool con copia (array da pool,
rilasciato automaticamente a fine iterazione). La prima è preferita per coerenza con la
filosofia "Speed over Memory" del progetto.

### 3.2. `onAttach`/`onDetach` vs. `initialize`/`dispose` in Component

La migrazione al pattern `Poolable` per i componenti richiede di riconciliare il lifecycle
esistente. Opzioni:
- **Rimozione**: `onAttach()`/`onDetach()` diventano `initialize()`/`dispose()` (breaking change minore, API più coerente)
- **Mantenimento come alias**: `onAttach` chiama `initialize`, o viceversa (più compatibile, più ridondante)
- **Raccomandazione**: rimozione pulita, dato che è ancora early-stage e la coerenza dell'API vale il breaking change

### 3.3. Pool Globale vs. Per-World per i Componenti

I pool di Entity sono già globali per-tipo. I pool di componenti potrebbero seguire la stessa
logica o essere per-World. Globale è più efficiente (meno pool da gestire) ma accoppia i
tipi al ciclo di vita del processo. Per-World è più pulito in scenari multi-World ma ha
overhead aggiuntivo. Raccomandata coerenza con Entity: pool globale per-tipo.

---

## 4. Rischi e Mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Componenti non correttamente resettati | Dati "fantasma" dal ciclo precedente | `dispose()` deve azzerare tutto; test automatici |
| Array scratch mal usato (riferimento conservato oltre l'iterazione) | Bug silenti | Documentazione chiara; guard in DEV mode |
| Pool che cresce senza limiti | Memory leak paradossale | `maxSize` configurabile con default ragionevole |
| Complessità aggiunta al lifecycle | Più difficile ragionare sul codice | Mantenere il path non-pooled; buona documentazione |

---

## 5. Riepilogo Priorità

| Fase | Contenuto | Stato | Priorità |
|---|---|---|---|
| 1 | `ObjectPool<T>`, `Poolable<T>` | ✅ Completato | — |
| 3 | Pool per Entity, `createEntity()`/`destroyEntity()` | ✅ Completato | — |
| 4 | Pool per Component, `createComponent()`/`destroyComponent()` | ✅ Completato | — |
| 2 | Pool per array delle query (scratch + QueryView) | ⬜ Da fare | Alta |
| 5 | Configurazione pool (maxSize, preallocazione per tipo) | ⬜ Da fare | Bassa |
