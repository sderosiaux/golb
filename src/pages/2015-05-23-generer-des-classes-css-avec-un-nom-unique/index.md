---
title: Générer des classes CSS avec un nom unique
date: "2015-05-23T20:33:19Z"
is_blog: true
path: "/articles/2015/05/23/generer-des-classes-css-avec-un-nom-unique/"
language: fr
---

A l'heure où l'on parle de *micro-services*, où l'on cherche à tout *modulariser*, à créer des systèmes à base de DAG, à ne plus rien mettre dans le scope *global* et à utiliser le scope *local* uniquement, histoire de maîtriser ce à quoi on a accès et d'éviter des *effets de bord* : on utilise encore un moteur CSS où l'on balance tous les sélecteurs à sa racine, qui utilise donc un scope global.

Pour ceux qui utilise le [shadow DOM](http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom-201), ce problème est résolu. Mais quid de ceux qui ne l'utilise pas ?

---
Summary {.summary}

[[toc]]

---

# Du JSCSS ?

Une partie de ce problème peut être évité en adoptant des normes d'écriture et de nommage telle que la norme **BEM**.

Elles peuvent malgré tout ne pas suffir ou être délicate à utiliser.

Avec BEM, les noms de classes peuvent être à rallonge, on aimerait bien généraliser le process de minification qu'on utilise sur le contenu des `.js` et des `.css`, sur le nom des classes elles-même ! Mais cela oblige à modifier d'une part le nom de la classe dans le fichier `.css` et également le code `.js` qui l'utilise.

Il est même maintenant possible de complétement se passer de fichier `.css` et d'utiliser uniquement du style inline.

Par exemple, avec ReactJS, le style peut être défini directement dans les composants Javascript, et avec des outils tel que [Radium](http://projects.formidablelabs.com/radium/), on peut même utiliser les sélecteurs spéciaux css tel que `:hover`, ou les média queries.

# Facebook et le CSS

Facebook a déjà résolu ce problème.

Sans doute avez-vous vu la [présentation ](https://speakerdeck.com/vjeux/react-css-in-js)de [@vjeux](https://twitter.com/vjeux) où il évoque comment Facebook s'assure:

- qu'il n'y a aucun conflit de nom de classe CSS
- que le scope *global* n'est pas pollué
- que les développeurs peuvent facilement rajouter du style sans avoir peur d'avoir des *effets de bord* et modifier le layout quelque part, sans le savoir.

Ils ont étendu le langage CSS en rajoutant une syntaxe spéciale pour les sélecteurs : `button/container` qui ne peut être utilisé que dans le fichier `button.css`, qui a son tour est référencé dans un composant ReactJS `Button.js`, qui enfin, fait référence à `className={cx('button/container')}` pour définir la classe d'un élément.

Le process de build vérifie ces références et génére un nom de classe unique à partir de `button/container` (qui n'est pas valide en CSS) par quelque-chose comme `._f8z`.

Cette classe fera partie du scope CSS global mais qui n'entrera jamais en conflit avec quoi que ce soit vu que le nom est généré aléatoirement (et est unique): personne ne pouvant le deviner à l'avance.

Tout le monde doit donc utiliser ce système pour travailler et styler son contenu.

Moi aussi j'aimerai faire ça. Ca tombe bien, webpack est là.

# webpack et le css-loader

webpack, et en particulier le plugin [css-loader](https://github.com/webpack/css-loader) combiné à [extract-text-webpack-plugin](https://github.com/webpack/extract-text-webpack-plugin), permet de former un (ou des) bundle CSS à partir de fichiers `.css`, `.less` ou `.sass` (avec les loaders qui vont bien) qui sont eux-même importés dans des fichiers `.js` :

```js
import React from 'react'
import './App.less'
export default class extends React.Component {
    render() {
        return <div className="App"></div>
    }
}
```

Avec une configuration webpack de ce genre :

```js
var ExtractTextPlugin = require('extract-text-webpack-plugin');
 
module.exports = {
  entry: './src/app.js',
  output: { path: __dirname + '/dist', filename: 'bundle.js' },
  loaders: [
    { test: /\.js$/, exclude: /node_modules/, loaders: [ 'babel-loader' ] },
    { test: /\.css$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader') },
    { test: /\.less$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader') }
  ]},
  plugins: [
    new ExtractTextPlugin('[name].css')
  ]
}
```

Ce build permet de créer un bundle CSS qui contiendra tout le contenu référencé par les imports de fichiers `.css` ou `.less` dans les fichiers Javascript.

```js
import './App.less';
```

# Le local scope

La nouveauté (avril 2015) est une nouvelle syntaxe au niveau des fichiers CSS pas encore transformés, mais prise en compte par `css-loader` : 

```css
:local(.container) {
    font-size: 30px;
}
```

Se transforme en : 

```css
._3ImWIJ65ktg-PxiyA_aFIC {
    font-size: 30px;
}
```

Cela signifie qu'on ne peut plus plus utiliser simplement `className="container"`: cette classe CSS n'existe **plus.**

On ne va pas non plus mettre `className="_3ImWIJ65ktg-PxiyA_aFIC"` quand même !

Il faut importer différemment les fichiers `.css` ou `.less` :

```js
import AppStyles from './App.less'
...
<div className={ AppStyles.container }>
```

Les classes définies dans le fichier CSS seront accessibles via leur nom dans l'object importé: si `:local(.my-class)` alors `my-class`.

On l'utilisera justement pour renseigner la `className` du composant.

Au niveau HTML, on aura ce rendu :

```html
<div class="_3ImWIJ65ktg-PxiyA_aFIC" data-reactid=".0">
```

Autre exemple avec un autre sélecteur css à l'intérieur : 

```css
:local(.container) {
    font-size: 31px;
    span { letter-spacing: 5px; }
}
```

Cela génère bien : 

```
._3ImWIJ65ktg-PxiyA_aFIC { font-size: 31px; }
._3ImWIJ65ktg-PxiyA_aFIC span { letter-spacing: 5px; }
```

# Des simples (key, value)

`AppStyles` est en fait simplement un dictionnaire généré et injecté à la volée de la forme : 

```js
module.exports = {
    "container":"_3ImWIJ65ktg-PxiyA_aFIC"
};
```

# Une className, pas un style

Attention à bien utiliser

```js
className={ AppStyle.container }
```

et non:

```js
style={ AppStyle.container }
```

sans quoi l'erreur suivante se produirait : 

```xml        
Uncaught Error: Invariant Violation:
The `style` prop expects a mapping from style properties to values, not a string.
For example, style={{marginRight: spacing + 'em'}} when using JSX.
```

# Comment sont générés les noms des classes

On peut modifier la manière dont le nom des classes sont générés.

Par défaut, il s'agit d'un hash comme on peut voir, mais on peut le modifier de la sorte (via `webpack.config.js`) :
    
```xml
css-loader?localIdentName=[hash:base64]

_3ImWIJ65ktg-PxiyA_aFIC
```
    
```xml
css-loader?localIdentName=[path]-[name]-[local]-[hash:base64:5]

.src--App-container-3ImWI
```

- `path:` le path du fichier Javascript
- `name:` le nom du fichier Javascript
- `local:` le nom utilisé dans le fichier CSS `:local(.container)`

Il n'y a malheureusement pas de méthodes (pour l'instant) pour générer des noms du genre `._a`, `._b`, ... `._az` histoire d'avoir des noms ultra courts et uniques (un simple compteur).