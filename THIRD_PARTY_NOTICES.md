# Third-Party Notices

This project (the frontend package) is distributed under GPL-3.0-or-later.
The following third-party components are used under their own licenses.

## Arco Design

- Package: `@arco-design/web-react`
- Copyright: Copyright (c) 2021 Bytedance, Inc. and its affiliates.
- License: MIT
- Homepage: <https://arco.design/>
- Repository: <https://github.com/arco-design/arco-design>

The admin console is themed with the open-source Arco Design token system and
uses Arco React components (Layout, Menu, Button, Card, Tag, Tabs, Input, etc.).
The admin stylesheet in `src/styles/admin.css` is original project code built on
documented Arco design tokens; it does not contain the former closed-source
Yuanli / ByteCloud CSS.

```text
MIT License

Copyright (c) 2021 Bytedance, Inc. and its affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other runtime dependencies

The frontend also depends on React, React Router, axios, Font Awesome Free,
simple-icons, qrcode, altcha, and related tooling. Their license texts are
available in `node_modules/<package>/LICENSE` and in the npm registry metadata.
When redistributing a build, keep the applicable copyright and license notices.
