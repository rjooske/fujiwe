<svelte:head>
  <title>フジヱの説明</title>
</svelte:head>

<h1>フジヱの説明</h1>
<img src="images/fujiwe.png" alt="フジヱ" />
<br />

<h2>履修情報ファイル</h2>

<p>
  履修情報ファイルは、それぞれの学生が履修している授業の一覧となるCSV形式のファイルです。
  このファイルは以下の列を含む必要があります。
</p>
<ul>
  <li>学籍番号</li>
  <li>科目番号</li>
  <li>論理削除</li>
</ul>

<h2>学籍情報ファイル</h2>

<p>
  学籍情報ファイルは、それぞれの学生が履修している授業の一覧となるCSV形式のファイルです。
  このファイルは以下の列を含む必要があります。
</p>
<ul>
  <li>学籍番号</li>
  <li>学生氏名</li>
  <li>Ｅ－ＭＡＩＬ＿大学</li>
  <li>Ｅ－ＭＡＩＬ</li>
</ul>

<h2>班別名簿ファイル</h2>

<p>
  班別名簿ファイルは、それぞれの情報の授業の名簿を管理するために使われているExcelファイルを指します。
  このファイルにあるシートをフジヱが正しく処理するためには、以下のセルがシートに含まれている必要があります。
</p>
<ul>
  <li>Fujiweセル</li>
  <li>科目番号ラベルセル</li>
  <li>科目番号セル</li>
  <li>科目名ラベルセル</li>
  <li>科目名セル</li>
  <li>学籍番号ラベルセル</li>
</ul>
<p>
  またシートの名前は、そのシートが扱う授業の対象となる学類など（例：比文2・日日）の名前として扱われます。
  シートが扱う授業の対象の学類名と、シート自体の名前を一致させてください。
</p>

<h3>Fujiweセル</h3>
<p>
  Fujiweセルは
  <code>fujiwe</code>
  という文字のみを含むセルです。 班別名簿ファイル内のシートにfujiweセルを置くことで、シートがフジヱに認識されるようになります。
  Fujiweセルはシート内のどこにあっても認識されます。 Fujiweセルを含まないシートはフジヱには認識されません。
</p>

<h3>科目番号ラベルセル・科目番号セル</h3>
<p>
  科目番号ラベルセルは「科目番号：」という文字のみを含むセル、科目番号セルは「6501102」など科目番号のみを含むセルです。
  科目番号ラベルセルはシート内のどこにあっても認識されますが、科目番号セルは科目番号ラベルセルの右隣にある必要があります。
  これらのセルは以下の例のようにシート内に配置してください。
</p>
<table>
  <tbody>
    <tr>
      <td>科目番号：</td>
      <td>6501102</td>
    </tr>
  </tbody>
</table>

<h3>科目名ラベルセル・科目名セル</h3>
<p>
  科目名ラベルセルは「科目名：」という文字のみを含むセル、科目名セルは「データサイエンス」など科目名のみを含むセルです。
  科目名ラベルセルはシート内のどこにあっても認識されますが、科目名セルは科目名ラベルセルの右隣にある必要があります。
  これらのセルは以下の例のようにシート内に配置してください。
</p>
<table>
  <tbody>
    <tr>
      <td>科目名：</td>
      <td>データサイエンス</td>
    </tr>
  </tbody>
</table>

<h3>学籍番号ラベルセル・学籍番号列</h3>
<p>
  学籍番号ラベルセルは「学籍番号」という文字のみを含むセル、学籍番号列は学籍番号ラベルセルを含む列です。
  学籍番号列のセルのうち学籍番号ラベルセルより下にあるセルは、シートが表す授業の名簿として読み取られます。
  そのため、該当するセルは全て学籍番号のみを含むセルである必要があります。
  これらのセルは以下の例のようにシート内に配置してください。
</p>
<table>
  <thead>
    <tr>
      <th style="width: 3em">...</th>
      <th>学籍番号</th>
      <th style="width: 3em">...</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td>202012345</td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td>202012346</td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td>202012347</td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td style="text-align: center">⋮</td>
      <td></td>
    </tr>
  </tbody>
</table>

<h2>メールのテンプレート</h2>

<p>
  「誤った授業を履修している学生へのメール」と「履修登録をしていない学生へのメール」の本文の入力欄では、テンプレート機能を使用することができます。
  このテンプレート機能を使って、メール作成時に学生などの情報を本文に自動で埋め込むことができます。
</p>

<h3>テンプレートで生成される本文の例</h3>

<p>
  データサイエンスの授業の履修に関して、以下の誤った授業を履修している学生が存在し、
</p>
<table>
  <thead>
    <tr>
      <th>学籍番号</th>
      <th>氏名</th>
      <th>履修すべき授業</th>
      <th>履修している授業</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>202012345</td>
      <td>加藤フジヱ</td>
      <td>6502102 (比文1)</td>
      <td>6501102 (人文1)</td>
    </tr>
  </tbody>
</table>
<p>またメールの本文が以下の通り設定されているとします。</p>
<pre>
$student_nameさん

$course_nameの履修に関して、
$registered_course_target対象の$registered_course_idじゃなくて、
$expected_course_target対象の$expected_course_idを履修してください。
</pre>

<p>
  すると、この学生に対してのメールを作成する際に、テンプレート機能によって以下の本文が自動で生成されます。
</p>
<pre>
加藤フジヱさん

データサイエンスの履修に関して、
人文1対象の6501102じゃなくて、
比文1対象の6502102を履修してください。
</pre>

<h3>誤った授業を履修している学生へのメール</h3>
<p>
  誤った授業を履修している学生へのメールの本文中では、以下の変数を使用することができます。
</p>
<table>
  <thead>
    <tr>
      <th>変数</th>
      <th>内容</th>
      <th>例</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>$student_id</code></td>
      <td>学籍番号</td>
      <td>202012345</td>
    </tr>
    <tr>
      <td><code>$student_name</code></td>
      <td>学生の氏名</td>
      <td>加藤フジヱ</td>
    </tr>
    <tr>
      <td><code>$expected_course_id</code></td>
      <td>履修すべき授業の科目番号</td>
      <td>6501102</td>
    </tr>
    <tr>
      <td><code>$expected_course_target</code></td>
      <td>履修すべき授業の対象</td>
      <td>人文1</td>
    </tr>
    <tr>
      <td><code>$registered_course_id</code></td>
      <td>履修している授業の科目番号</td>
      <td>6502102</td>
    </tr>
    <tr>
      <td><code>$registered_course_target</code></td>
      <td>履修している授業の対象</td>
      <td>比文1</td>
    </tr>
    <tr>
      <td><code>$course_name</code></td>
      <td>授業名</td>
      <td>データサイエンス</td>
    </tr>
  </tbody>
</table>

<h3>履修登録をしていない学生へのメール</h3>
<p>
  履修登録をしていない学生へのメールの本文中では、以下の変数を使用することができます。
</p>
<table>
  <thead>
    <tr>
      <th>変数</th>
      <th>内容</th>
      <th>例</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>$student_id</code></td>
      <td>学籍番号</td>
      <td>202012345</td>
    </tr>
    <tr>
      <td><code>$student_name</code></td>
      <td>学生の氏名</td>
      <td>加藤フジヱ</td>
    </tr>
    <tr>
      <td><code>$expected_course_id</code></td>
      <td>履修すべき授業の科目番号</td>
      <td>6501102</td>
    </tr>
    <tr>
      <td><code>$expected_course_target</code></td>
      <td>履修すべき授業の対象</td>
      <td>人文1</td>
    </tr>
    <tr>
      <td><code>$course_name</code></td>
      <td>授業名</td>
      <td>データサイエンス</td>
    </tr>
  </tbody>
</table>

<style lang="scss">
  pre {
    padding: 1em;
    border: 1px solid #aaa;
    background-color: #f9f9f9;
  }
</style>
