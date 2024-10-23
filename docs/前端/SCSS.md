---
typora-copy-images-to: ./../images
---

## 变量

```scss
$primary-color: #123fff;
$primary-border: 1px solid $primary-color;

div.box {
    background-color: $primary-color;
}
```

## 嵌套

```scss
.nav {
    height: 100px;
    ul {
        margin: 0;
        li {
            float: left;
            list-style: none;
            padding: 5px;
        }
    }
}
```

嵌套样式在编译后会展开成

```css
.nav {
    height: 100px;
}
.nav ul {
    margin: 0;
}
.nav ul li {
    float: left;
    list-style: none;
    padding: 5px;
}
```

## 嵌套调用父选择器

```scss
.nav {
    height: 100px;
    ul {
        margin: 0;
        li {
            float: left;
            list-style: none;
            padding: 5px;
            :hover {
                background-color: #123456;
                color: #ffffff
            }
        }
    }
}
```

编译后的样式为：

```css
.nav {
    height: 100px;
}
.nav ul {
    margin: 0;
}
.nav ul li {
    float: left;
    list-style: none;
    padding: 5px;
}
.nav ul li :hover{
    float: left;
    list-style: none;
    padding: 5px;
}
```

这种并不是我们想要的结果。调用父选择器时只需在前面加`&`符号

```scss
.nav {
    height: 100px;
    ul {
        margin: 0;
        li {
            float: left;
            list-style: none;
            padding: 5px;
            &:hover {
                background-color: #123456;
                color: #ffffff
            }
        }
    }
}
```

编译后就变成

```scss
.nav {
    height: 100px;
}
.nav ul {
    margin: 0;
}
.nav ul li {
    float: left;
    list-style: none;
    padding: 5px;
}
.nav ul li:hover{
    float: left;
    list-style: none;
    padding: 5px;
}
```

## 嵌套属性

```scss
body {
    font: {
        family: Arial;
        size: 15px;
        weight: normal;
    }
}
```

编译后就是

```css
body {
    font-family: Arial;
    font-size: 15px;
    font-weight: normal;
}
```

