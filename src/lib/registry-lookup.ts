/* R249 [§S16]: one lookup for the equation layer's three registries.
 *
 * buildDiagram() read three registries in eleven adjacent lines with three
 * different failure modes. A parameter id was guarded with
 * `(def && def.label) || pid`, so an unknown one became a diagram node
 * labelled with the raw id and nothing reported it. A ramp or model id was
 * read unguarded through `as RampId` / `as ModelId`, so an unknown one threw a
 * TypeError inside a render path. buildLeafPanel() in quality-client.ts
 * repeated both. Measured at the start of §S16, every leaf reference in the
 * equations resolved, so none of this fired (the log has the count).
 *
 * Every one of those reads goes through here now: an unknown id throws an
 * error naming the registry and the id, written once in keyOrThrow(), and a
 * string from the page becomes a RampId or ModelId through keyOrThrow()
 * rather than an assertion nothing checks. The review of P22 found the client
 * had copied the message beside two type guards; both guards are gone. Same
 * pattern as the data-phase generator's "Unknown KPP/TPP".
 *
 * Review 2 of P22: every call used to pass a registry and its name side by
 * side, typed by hand at each site. A registry carries its own name now,
 * declared once beside the data (the data's own symbol, so the message
 * points at where the entry is missing), and a lookup cannot be handed one
 * registry and another's name. */
export interface NamedRegistry<K extends string, T> {
  readonly name: string;
  readonly entries: Readonly<Record<K, T>>;
}

export function namedRegistry<K extends string, T>(name: string, entries: Readonly<Record<K, T>>): NamedRegistry<K, T> {
  return { name: name, entries: entries };
}

/* The membership test, once: an own entry, so an inherited key such as
   `toString` is not one. Review 1 of P25: exported for a check that asks
   whether an entry exists rather than reading it. */
export function hasKey<K extends string, T>(registry: NamedRegistry<K, T>, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(registry.entries, id);
}

/* The key itself, typed as the registry's key, for a caller that needs the
   id rather than the entry (rampValueAt takes a RampId). The one assertion
   in this file is behind the membership test. */
export function keyOrThrow<K extends string, T>(registry: NamedRegistry<K, T>, id: string): K {
  if (!hasKey(registry, id)) {
    throw new Error(registry.name + ' has no entry "' + id + '"');
  }
  return id as K;
}

export function lookupOrThrow<K extends string, T>(registry: NamedRegistry<K, T>, id: string): T {
  return registry.entries[keyOrThrow(registry, id)];
}

/* Review 4 of P24: one lookup of a catalog record by its id, throwing when
   the id is not there. quality.ts's qualityRecord() and the engine's
   catalogTargetMeta() each wrote it out, and the engine cannot import
   quality.ts, which imports the engine. Review 5 of P24: its `where`
   argument was always "the catalog", so it is the catalog's lookup. */
export function catalogRecordById<T extends { id: string }>(records: readonly T[], id: string): T {
  const record = records.filter(function (r) { return r.id === id; })[0];
  if (!record) throw new Error(id + ' is not a record in the catalog');
  return record;
}
