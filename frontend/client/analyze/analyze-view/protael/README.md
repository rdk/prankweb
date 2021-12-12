# Protael as sequence view
While Protal is available via GitHub we have done some modifications to make it work. 
That is the reason we host the libraries our self.

## Dependencies
Snap is required by protael, we obtain it using HTML import in head.
Reason is that snap.svg does not work if imported using webpack and the import example
```
imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js
```
is using obsolete syntax. 
Proteal also utilize jQuery with jQuery-ui.
Both libraries are again provided in the head element.
