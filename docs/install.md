Yacol requires babel plugin transform-async-to-module-method to, well, transform async to custom
implementation. To do so:

- `npm install yacol --save` or `yarn add yacol`
- `npm install babel-plugin-transform-async-to-module-method --save` or `yarn ...`
- add the following to your .babelrc

```javascript
{
  "plugins": [
      ["transform-async-to-module-method", {
          "module": "yacol",
          "method": "coroutine"
      }]
  ]
}
```

- If you're not doing it so, don't forget to run your code with `babel-node`.
- Happy hacking!

