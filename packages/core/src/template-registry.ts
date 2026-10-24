/**
 * Template registry (BF-302 marketplace + BF-481 template gallery).
 *
 * Templates are versioned composition blueprints a host app renders without
 * the user touching code. Registry is DOM-free and network-free.
 */

export interface Template {
  readonly name: string;
  readonly version: string;
  /** Template content (composition JSON, props schema, etc.). */
  readonly payload: unknown;
}

const templates = new Map<string, Template>();

/** Register a template. Re-registering same name+version overwrites. */
export function registerTemplate(name: string, template: Template): void {
  templates.set(template.name, template);
}

/** Return the template for `name`, or `undefined` if none. */
export function getTemplate(name: string): Template | undefined {
  return templates.get(name);
}

/** All registered template names. */
export function listTemplates(): readonly string[] {
  return [...templates.keys()];
}

export function clearTemplates(): void {
  templates.clear();
}
