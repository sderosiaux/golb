---
title: Atom, Alt-GR, and Windows walk into a bar
description: Alt-GR is a bit delicate to handle with Atom on Windows
date: "2015-02-03T23:41:05Z"
is_blog: true
path: "/articles/2015/02/03/atom-alt-gr-and-windows-walk-into-a-bar/"
language: en
---

TOC

# Typing ']' does not work with azerty keyboards

When using an azerty keyboard on Windows, we can run into one issue that is very annoying when we code: not being able to type `]` using `Alt-GR + )`. It won't do a thing.

[[warn]]
|Don't throw your Atom away yet. Everything has an explication.

We can notice what is happening when we hit `]` according to where the cursor is (look at the status bar).

By default, there are predefined shortcuts on this key. To see them, go to `Settings > Keybindings`:

![atom shortcut](atom-shortcut1.png)
The shortcut mentioned is: `Ctrl + Alt + [`, to `fold-current-row`, but we are not typing that, we are typing `Alt-GR + ]` right ?

Two things that needs explanations : 

- on Windows, `Alt-GR` = `Ctrl+Alt`
- when we type `]`, the keyboard mapping truly says that we typed `[`. Disturbing. We can see that in action by enabling `Settings > Key Binding Resolver > Toggle`, then type `Alt-GR + ]`, it will be resolved to `Ctrl-Alt-[`.

Wanna read more about Alt-GR ? There is a big topic talking about that problem since more than 6 months : https://github.com/atom/atom-keymap/issues/35

[[info]]
|This issue has been resolved in Sep-2016, so maybe this whole article is deprecated

# Multiple fixes possible

There are several ways to fix this behavior, for let us have our `]`.

## Brutal

We can remove any `keyBindings` using this combinaison by editing our init script `init.coffee` and add :

```javascript
atom.keymap.keyBindings = atom.keymap.keyBindings.filter((binding, i) ->
                            ['ctrl-alt-['].indexOf(binding.keystrokes) == - 1)
```

It will ensure that `Alt-GR + ]` is always free.

If you know CoffeeScript, it's a nice place to have some fun. We have access to the whole Atom engine.

## Override

Why not override the shortcut `editor:fold-current-row` to be triggered by something else ?

For instance, by adding this mapping into `keymap.cson` (don't forget to restart Atom):

```javascript
'atom-workspace atom-text-editor:not([mini])': { 'ctrl-alt-=': 'editor:fold-current-row' }
```

We will see it in `Settings > Keybindings`. Unfortunately, the original binding is still there and will take precedence when typing `]`.

It's another long debate : https://www.google.fr/?#q=atom+override+key+binding

The best solution is not that far.

## Extension

Our previous tentative was just adding a new shortcut to the keys combinaison, think that as a `$.extend`.
What we need, more brutal, is to clear the previous behavior of `Ctrl-Alt-[`.

There is a keyword to do so `unset!`:

```javascript
'atom-workspace atom-text-editor:not([mini])': { 'ctrl-alt-[': 'unset!' }
```
Et voilà, the editor is not bound anymore on the combinaison.

More details on how the keymaps are working : https://github.com/atom/atom-keymap.

# Going further: custom commands

With Atom, we can also *create* any command we want.

Look for `init.coffee`, and add something like:

```javascript
atom.commands.add 'atom-text-editor',
                  'user:insert-date': (event) -> editor =
                       @getModel() editor.insertText(new Date().toLocaleString())
```

That defines a new command `user:insert-date` in the scope of the `atom-text-editor` that will insert the current date in the editor, where our cursor is.
We just need to bind it to some keys, by editing `keymap.cson`: 

```javascript
'atom-workspace atom-text-editor:not([mini])': { 'ctrl-alt-=': 'user:insert-date' }
```

And we're all set. There are tons of functions available in the `editor` object, feel free to discover and use them !
Using the devtools, it's possible to grab a reference to the Atom editor:

```javascript
atom.workspace.getEditors();
```
