import { get, set, KEYS } from './storage.js';

export function getTodos() {
  return get(KEYS.todos, []);
}

export function addTodo(text) {
  const todos = getTodos();
  todos.unshift({ id: Date.now(), text: text.trim(), done: false });
  set(KEYS.todos, todos);
  return todos;
}

export function toggleTodo(id) {
  const todos = getTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  set(KEYS.todos, todos);
  return todos;
}

export function deleteTodo(id) {
  const todos = getTodos().filter(t => t.id !== id);
  set(KEYS.todos, todos);
  return todos;
}
