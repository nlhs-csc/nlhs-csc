<!-- .slide: class="cover" -->

# 第 一 次社課

## 資料型別

資研社｜競程組

---

<!-- .slide: class="concept" -->

## 電腦是如何儲存資料的？

電腦不像人一樣，可以直接「記住」一件事情<br>
電腦需要將資料轉換成可以被儲存的形式<br>
最基本的方式，就是利用電子元件的「狀態」來表示資料<br>

<!-- .slide: class="concept" -->

我們可以把兩種狀態分別表示成：<br>
高電位 → `1`<br>
低電位 → `0`<br>

因此，電腦最基本的資料單位就是 `0` 和 `1` ，也就是二進制<br>

---

<!-- .slide: class="concept" -->

## 二進制？


我們知道 10進制就是逢 `10` 進 `1`<br>
那 2進制也是 不過是逢 `2` 進 `1`<br>

---

<!-- .slide: class="concept" -->

### 十進制怎麼轉二進制?

假設有一個數 $k$<br>
不斷將 $k$ 除以 $2$ 並記錄每次除法的餘數<br>

最後將這些餘數由下往上讀 就是 $k$ 的二進制表示<br>

### 二進制怎麼轉十進制?

假設有一個二進制的數 $B$<br>
第 $i$ 位是 $B_i$ 且總共有 $n$ 位<br>
則 $B$ 可以表達為 $B_n B_{n-1} \cdots B_2 B_1$<br>

則 $B_{(2)}$ 的十進制就是 $\sum \limits ^{n}_{i = 1} B_i \times 2^{i-1}$<br>

---

<!-- .slide: class="concept" -->

## Bit & Byte

### Bit 是什麼？

我們前面提到：<br>
電腦最基本的資料就是 `0` 和 `1`<br>
這 $1$ 個 `0` 或 `1` 就稱之為 $1$ bit（位元）<br>

因為一個 bit 只有兩種可能：<br>
`0` 或 `1`

所以 1 bit 可以表示 2 種狀態<br>
而 $n$ bit 可以表示 $2^n$ 種狀態<br>

---

<!-- .slide: class="concept" -->

### Byte 是什麼，為甚麼需要他？

我們將 $8$ bits 定義為 $1$ Byte<br>
所以 $1$ Byte 可以表示 $2^8$ 也就是 $256$ 種狀態<br>

如果只說：<br>
「 這個資料有 $32$ 個 `0` 和 `1` 」
會很麻煩，當量大的時候會不好管理<br>

所以電腦通常會用固定大小的資料單位來處理：<br>
|1 Byte  |$=$|  8 bits |
|-|-|-|
|1 KiB    |$=$|  1024 Bytes|
|1 MiB    |$=$|  1024 KiB|
|1 GiB    |$=$|  1024 MiB|

例如一個檔案大小 $5$ MB，意思就是它大約需要 500 萬個 Byte 的空間

---

<!-- .slide: class="concept" -->

### 冷知識

市面上看到的隨身碟、硬碟，如果他說他有 $256$ GB<br>
則他只有 $256 \times 10^{9}$ Bytes<br>

也就是 $\displaystyle \frac{256 \times 10^9}{1024^3} \approx 238.42$ GiB<br>

比 $256$ GiB 少了約 $17.5$ GiB 的容量<br>

---

<!-- .slide: class="concept" -->

## 資料型別

### 整數、字元、浮點數

如果電腦只認得 `0` 和 `1`<br>
那 `123`、`A`、`3.14` 是怎麼儲存的？<br>

答案很簡單<br>
不同種類的資料 會使用不同的方式 把資料表示成二進制<br>

---

<!-- .slide: class="concept" -->

### 整數 Integer

假設有一整數 $114514$<br>
轉換為二進制後 在電腦中可以這樣表示：<br>
```
00000000 00000001 10111111 01010010
```
這就是整數資料 `int`<br>

Python：<br>
```pythin=
num = 114514
```

在 Python 中，`int` 可以儲存超大的數值<br>
不過...<br>

---

<!-- .slide: class="concept" -->

### 長整數 Long Integer

不過，在 C++ 等語言中<br>
當數值太大 $(\ge 2^{31})$ 時，單純 `int` 就無法儲存<br>
這時候就需要長整數

C++ 中的長整數以 `long long` 表示<br>

C++：<br>
```cpp=
int num = 114514; // 單純整數
long long long_num = 1145141919810; // 好長的整數
```

---

<!-- .slide: class="concept" -->

### 浮點數 Floating Point

那 `3.14` 呢？<br>
整數的表示方法不能直接拿來精確表示所有小數<br>
所以電腦有另一種表示方法：<br>

浮點數（Floating Point）<br>

不過電腦中的浮點數不一定能精確表示我們平常看到的小數<br>
像是 $0.1 + 0.2$ 應該要是 $0.3$<br>
不過 Python 中，你會得到 $0.30000000000000004$<br>

會這樣的原因是<br>
`0.1`、`0.2` 在二進制浮點表示下無法完全精確呈現<br>

---

<!-- .slide: class="concept" -->

### 雙精倍浮點數 Double

在 C++ 等語言中<br>
當數值需要更精確的值和更大的範圍時，單純 `float` 就無法儲存<br>
這時候就需要雙精倍浮點數<br>

C++ 中的雙精倍浮點數以 `double` 表示<br>
而通常 Python 中的 `float` 本身是 `double`<br>

---

<!-- .slide: class="code" -->

### 演示

Python 建立變數跟 $0.1+0.2$：<br>
```python=
num_a = 0.1 # 第一個浮點數
num_b = 0.2 # 第二個浮點數
print(num_a + num_b)
```
然後你會得到 `0.30000000000000004`<br>

C++ 建立變數：<br>
```cpp=
float num_float = 3.14; // 浮點數
double num_double = 3.14; // 雙精倍浮點數
```

---

<!-- .slide: class="concept" -->

### 字元 Character

那 `A` 呢？<br>

電腦不能直接儲存「`A`」這個概念<br>
所以我們會建立一套編碼，把字元對應到數值<br>

常見的例如 ASCII：<br>
`A` → `65`

因此：<br>
`A` → `65` → `01000001`

從電腦的角度來看：<br>
「`A`」 最後變成了 「`01000001`」<br>

---

<!-- .slide: class="concept" -->

### 字串 String

但是如果我們要儲存單字 像是 `HelloWorld` 呢？<br>
這時候就需要 `String` 字串<br>

可以把字串想像成一堆字元組裝在一起<br>

而在 Python 中，一個字元也是一個字串<br>
因為 Python 沒有 `Character` 型別 QAQ<br>

---

<!-- .slide: class="code" -->

### 演示

Python：<br>
```pythin=
c = 'A'   # 建立一個字元 'A'
s = "awa" # 建立一個字串 "awa"
```

C++：<br>
```cpp=
#include <string>

char c = 'A';     // 建立一個字元 'A'，字元是單引號
std::string s = "awa"; // 建立一個字串 "awa"，字串是雙引號
```

---

<!-- .slide: class="concept" -->

### 布林值 Boolean

布林值簡單來說就是是非對錯<br>
他是用來儲存 `true` 跟 `false` 的<br>

也就是說，`bool` 只有兩種狀態<br>
所以，我們可以理解成：<br>
`true` → `1`、`false` → `0`<br>

---

<!-- .slide: class="code" -->

### 演示

Python：<br>
```python=
b1 = True # 將 b1 設為 true，也就是「真」
b2 = False # 將 b2 設為 false，也就是「假」
```

C++：<br>
```Cpp=
bool b1 = true; // 將 b1 設為 true，也就是「真」
bool b2 = false; // 將 b2 設為 false，也就是「假」
```