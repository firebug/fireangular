FireAngular 0.0.1-zeta.1
========================

![](https://raw.githubusercontent.com/firebug/fireangular/master/docs/images/fireangular_banner.png)

Firefox plugin for Angular development. Built on top of native
developer tools in Firefox and based on the [firebug.sdk](firebug.sdk).

[Firebug 3](firebug.next) isn't required, but the screen-shot below shows how native developer tools
look like when Firebug theme is activated.

![](https://raw.githubusercontent.com/firebug/fireangular/master/docs/images/inspector.png)

![](https://raw.githubusercontent.com/firebug/fireangular/master/docs/images/inspector_firebug.png)

Try it for yourself:

1. Install [FireAngular](https://github.com/rpl/fireangular/releases) (currently zeta)
2. Load an Angular webapp, e.g. [TODO MVC Angular](http://todomvc.com/examples/angularjs/#/)
3. Inspect an Angular generated DOM Element

Build it by yourself:

1. Clone the repository: ```git clone https://github.com/firebug/fireangular.git```
2. Install npm dependencies ```npm install```
3. Run ```npm run jpm-run [-- -b /path/to/firefox]```
4. or Build xpi ```npm run jpm-xpi```

License
-------
FireAngular is free and open source software distributed under the
[BSD License](https://github.com/rpl/fireangular/blob/master/license.txt).

Hacking on FireAngular
--------------------
See FireAngular [Developer Guide](https://github.com/firebug/fireangular/wiki/Developer-Guide)

Further Resources
-----------------
* DevTools Extension Examples: https://github.com/mozilla/addon-sdk/tree/devtools/examples

[firebug.sdk]: https://github.com/firebug/firebug.sdk
[firebug.next]: https://github.com/firebug/firebug.next
