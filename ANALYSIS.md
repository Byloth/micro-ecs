# Analisi Tecnica: Micro ECS Engine

**Data:** 20 Novembre 2025
**Redatto da:** CTO, GitHub Copilot
**Oggetto:** Validazione Codebase, Analisi Architetturale e Performance Review

---

## 1. Executive Summary

L'analisi della codebase `micro-ecs` rivela un progetto ben strutturato, tipizzato con rigore e scritto con un codice pulito e leggibile. L'approccio scelto è fortemente **Object-Oriented (OOP)**, privilegiando l'ergonomia delle API (Developer Experience) rispetto alla pura teoria ECS Data-Oriented (DOD).

Sebbene l'obiettivo di "facilità d'uso" sia stato centrato, l'obiettivo di "massime prestazioni" ed "estrema ottimizzazione" è attualmente compromesso da alcune scelte architetturali che generano overhead di memoria e pressione sul Garbage Collector (GC).

È stata individuata **una criticità bloccante** per l'ambiente Web (minificazione) e diverse aree di debito tecnico prestazionale.

---

## 2. Criticità Bloccanti (Urgenti)

### 2.1. Incompatibilità con Minificazione (Build Production)
**Severità:** 🔴 **CRITICA**
**File:** `src/query-manager.ts`

Il sistema di query si basa sui nomi delle classi dei componenti per generare chiavi univoche per le View:
```typescript
// src/query-manager.ts
const key = types.map((type) => type.name).sort().join(",");
```
In ambiente Web, i processi di build (Webpack, Vite, Rollup, Terser) "minificano" il codice, rinominando le classi in nomi brevi (es. `class Position` diventa `class a`).
Se due classi diverse vengono minificate nello stesso nome (in bundle diversi o per collisioni) o se la logica di hashing cambia, il sistema di query crollerà silenziosamente o produrrà risultati errati.

**Azione Richiesta:**
Abbandonare immediatamente `type.name`. Implementare una proprietà statica univoca (es. `static readonly typeId = Symbol()`) o un registro numerico incrementale interno all'engine per identificare i tipi di Componenti.

---

## 3. Analisi Architetturale

### 3.1. "Fat Entity" vs "Pure Entity"
L'attuale implementazione di `Entity` (`src/entity.ts`) è una classe "pesante" che mantiene lo stato (`_components`, `_contexts`, `_dependencies`).
*   **Pro:** API molto intuitiva (`entity.addComponent(...)`).
*   **Contro:** Ogni entità è un oggetto allocato nell'Heap. In uno scenario con 100.000 entità, questo comporta un notevole overhead di memoria e frammentazione.
*   **Verdetto:** Accettabile per un engine "general purpose" web, ma limita il numero massimo di entità gestibili rispetto a un approccio basato su ID (dove l'entità è solo un intero).

### 3.2. Componenti come Classi
I componenti sono istanze di classi.
*   **Impatto:** Pointer chasing. Per accedere ai dati, la CPU deve saltare dall'Entità alla Mappa dei Componenti, al Componente stesso. Questo distrugge la *cache locality*.
*   **Nota:** In JavaScript/V8, questo è meno critico che in C++ a causa della natura del linguaggio, ma rimane un collo di bottiglia per l'iterazione massiva.

### 3.3. Over-engineering su Dipendenze e Contesti
Il sistema gestisce automaticamente dipendenze tra componenti (`_dependencies`) e contesti (`EntityContext`).
*   **Analisi:** Sebbene utile per prevenire errori logici, aggiunge complessità computazionale (`Map` lookups aggiuntivi) a operazioni frequenti come l'aggiunta/rimozione di componenti. Per un engine "minimale", questo è un lusso costoso.

---

## 4. Performance e Ottimizzazione

### 4.1. Allocazione Dinamica e GC Pressure
Nel metodo `findAll` di `QueryManager`:
```typescript
return new SmartIterator(this._entities.values())
    .filter(...)
    .map(...)
```
Ogni chiamata a `findAll` (che potrebbe avvenire ogni frame in ogni sistema) alloca nuovi oggetti Iterator, nuove closure per `filter` e `map`, e array temporanei.
**Rischio:** Questo genererà "Garbage" costante, causando micro-stuttering (singhiozzi) nel framerate quando il GC entra in azione.

### 4.2. String Manipulation in Hot Path
La generazione della chiave della query avviene a runtime:
```typescript
types.map((type) => type.name).sort().join(",")
```
Eseguire operazioni su stringhe (allocazione, concatenazione) all'interno del loop di gioco è una pratica da evitare assolutamente. Le chiavi delle query devono essere calcolate una volta sola o hashate staticamente.

### 4.3. Strutture Dati (Map vs Array)
L'uso estensivo di `Map` (`_components` in Entity, `_entities` in World) è semanticamente corretto ma più lento dell'accesso diretto agli Array.
*   **Suggerimento:** Per le entità, considerare l'uso di Array sparsi o TypedArrays se si passasse a un approccio basato su ID. Per i componenti, `Map` è accettabile solo se il numero di componenti per entità è basso.

---

## 5. Piano d'Azione Suggerito

1.  **FIX IMMEDIATO:** Sostituire `constructor.name` con un sistema di ID univoci per i Componenti.
2.  **OTTIMIZZAZIONE QUERY:**
    *   Cache delle chiavi di query. Non ricalcolare la stringa ogni volta.
    *   Refactoring di `findAll` per restituire un iteratore che non alloca memoria (o ne alloca pochissima) ogni frame.
3.  **SEMPLIFICAZIONE:** Valutare la rimozione del sistema di `dependencies` e `contexts` automatici se non strettamente necessari per l'MVP. La responsabilità della coerenza dei dati dovrebbe spostarsi parzialmente sull'utente o sui Sistemi, alleggerendo l'Entità.
4.  **POOLING:** Introdurre un sistema di *Object Pooling* per Entità e Componenti per mitigare il costo di allocazione delle classi.

## 6. Conclusione

Il codice è di alta qualità formale ma "ingenuo" sul fronte delle performance pure per un game engine. Si è data priorità all'astrazione OOP piuttosto che al data-layout. Per il target "Web/JS", questo è un compromesso spesso necessario, ma le criticità segnalate (GC pressure e Minificazione) devono essere risolte prima di qualunque rilascio.
