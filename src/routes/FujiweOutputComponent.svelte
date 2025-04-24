<script module lang="ts">
  export type FujiweOutput = {
    courseName: string;
    discrepancy: RegistrationDiscrepancy;
  };
</script>

<script lang="ts">
  import type {
    RegistrationDiscrepancy,
    StudentInNoCourse,
    StudentInWrongCourse,
  } from "$lib/fujiwe";

  const {
    output,
    sendWrongCourseEmail,
    sendNoCourseEmail,
  }: {
    output: FujiweOutput;
    sendWrongCourseEmail: (s: StudentInWrongCourse) => void;
    sendNoCourseEmail: (s: StudentInNoCourse) => void;
  } = $props();
</script>

<h2>授業名: {output.courseName}</h2>

<h3>誤った授業を履修している学生</h3>
{#if output.discrepancy.studentsInWrongCourse.length === 0}
  <p>誤った授業を履修している学生はいません。</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>氏名</th>
        <th>履修すべき授業</th>
        <th>履修している授業</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsInWrongCourse as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.name}</td>
          <td>
            {student.expectedCourse.id} ({student.expectedCourse.targetName})
          </td>
          <td>
            {student.registeredCourse.id} ({student.registeredCourse
              .targetName})
          </td>
          <td>
            <button onclick={() => sendWrongCourseEmail(student)}>
              メールを送信
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<h3>履修登録をしていない学生</h3>
{#if output.discrepancy.studentsInNoCourse.length === 0}
  <p>履修登録をしていない学生はいません。</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>氏名</th>
        <th>履修すべき授業</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsInNoCourse as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.name}</td>
          <td>
            {student.expectedCourse.id} ({student.expectedCourse.targetName})
          </td>
          <td>
            <button onclick={() => sendNoCourseEmail(student)}>
              メールを送信
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if output.discrepancy.studentsInUnknownCourse.length !== 0}
  <h3>名簿が存在しない授業を履修している学生</h3>
  <p class="error">
    履修情報ファイルに存在する学生のうち、以下の学生が班別名簿ファイルに存在しない授業を履修しています。
  </p>
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>氏名</th>
        <th>履修している授業</th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsInUnknownCourse as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.name}</td>
          <td>{student.unknownCourseId}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if output.discrepancy.studentsWithoutDetails.length !== 0}
  <h3>学籍情報が存在しない学生</h3>
  <p class="error">
    班別名簿ファイルに存在する学生のうち、以下の学籍番号の学生が学籍情報ファイルに存在しません。
  </p>
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>班別名簿のシート名</th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsWithoutDetails as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.expectedCourse.targetName}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .error {
    color: #ee0000;
  }
</style>
