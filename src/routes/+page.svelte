<script lang="ts">
  import {
    findRegistrationDiscrepancy,
    type Course,
    type Student,
    type StudentInNoCourse,
    type StudentInWrongCourse,
  } from "$lib/fujiwe";
  import FujiweOutputComponent, {
    type FujiweOutput,
  } from "./FujiweOutputComponent.svelte";
  import FujiweInputComponent, {
    type FujiweInput,
  } from "./FujiweInputComponent.svelte";
  import type { EmailTemplate } from "./EmailTemplateInput.svelte";
  import FujiweDialogComponent, {
    type FujiweDialog,
  } from "./FujiweDialogComponent.svelte";

  type MailtoUriParams = {
    recipients: string[];
    cc: string[];
    subject: string;
  };

  function createMailtoUri(p: MailtoUriParams): string {
    return (
      "mailto:" +
      p.recipients.map(encodeURIComponent).join(",") +
      "?cc=" +
      p.cc.map(encodeURIComponent).join(",") +
      "&subject=" +
      encodeURIComponent(p.subject)
    );
  }

  function fillInWrongCourseTemplate(
    template: string,
    student: StudentInWrongCourse,
    expectedCourse: Course,
  ): string {
    const variables: [string, string][] = [
      ["$student_id", student.id],
      ["$student_name", student.name],
      ["$expected_course_id", expectedCourse.id],
      ["$expected_course_target", expectedCourse.targetName],
      ["$registered_course_id", student.registeredCourse.id],
      ["$registered_course_target", student.registeredCourse.targetName],
      ["$course_name", expectedCourse.name],
    ];
    for (const [pattern, replacement] of variables) {
      template = template.replaceAll(pattern, replacement);
    }
    return template;
  }

  function fillInNoCourseTemplate(
    template: string,
    student: Student,
    expectedCourse: Course,
  ): string {
    const variables: [string, string][] = [
      ["$student_id", student.id],
      ["$student_name", student.name],
      ["$expected_course_id", expectedCourse.id],
      ["$expected_course_target", expectedCourse.targetName],
      ["$course_name", expectedCourse.name],
    ];
    for (const [pattern, replacement] of variables) {
      template = template.replaceAll(pattern, replacement);
    }
    return template;
  }

  function clickUri(uri: string) {
    const a = document.createElement("a");
    a.href = uri;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let wrongCourseEmailTemplate = $state<EmailTemplate>({
    subject: "",
    body: "",
  });
  let noCourseEmailTemplate = $state<EmailTemplate>({
    subject: "",
    body: "",
  });
  let fujiweOutput = $state<FujiweOutput | undefined>();
  let fujiweDialog = $state<FujiweDialog>({ emotion: "neutral", text: "" });

  function onFileInputStart() {
    fujiweOutput = undefined;
    fujiweDialog = { emotion: "neutral", text: "" };
  }

  function onFileInputError() {
    fujiweDialog = {
      emotion: "sad",
      text: "ファイルがおかしいかもしれないねえ",
    };
  }

  function onFileInputSuccess(input: FujiweInput) {
    const discrepancy = findRegistrationDiscrepancy(
      input.registeredCourseIds,
      input.students,
      input.courses,
    );
    fujiweOutput = { discrepancy, courseName: input.courseName };

    if (
      discrepancy.studentsInWrongCourse.length > 0 ||
      discrepancy.studentsInNoCourse.length > 0
    ) {
      fujiweDialog = {
        emotion: "neutral",
        text: "メールしてあげないといけないみたいだねえ",
      };
    } else {
      fujiweDialog = {
        emotion: "happy",
        text: "みんなえらい！",
      };
    }
  }

  async function sendWrongCourseEmail(student: StudentInWrongCourse) {
    const body = fillInWrongCourseTemplate(
      wrongCourseEmailTemplate.body,
      student,
      student.expectedCourse,
    );
    const uri = createMailtoUri({
      subject: wrongCourseEmailTemplate.subject,
      recipients: [student.schoolEmail],
      cc: [student.personalEmail],
    });
    await navigator.clipboard.writeText(body);
    clickUri(uri);
  }

  async function sendNoCourseEmail(student: StudentInNoCourse) {
    const body = fillInNoCourseTemplate(
      noCourseEmailTemplate.body,
      student,
      student.expectedCourse,
    );
    const uri = createMailtoUri({
      subject: noCourseEmailTemplate.subject,
      recipients: [student.schoolEmail],
      cc: [student.personalEmail],
    });
    await navigator.clipboard.writeText(body);
    clickUri(uri);
  }
</script>

<svelte:head>
  <title>フジヱ</title>
</svelte:head>

<h1>フジヱ</h1>
<a href="manual">説明ページ</a>
<br />
<br />

<FujiweDialogComponent dialog={fujiweDialog} />
<br />

<FujiweInputComponent
  bind:wrongCourseEmailTemplate
  bind:noCourseEmailTemplate
  {onFileInputStart}
  {onFileInputSuccess}
  {onFileInputError}
/>

{#if fujiweOutput !== undefined}
  <FujiweOutputComponent
    output={fujiweOutput}
    {sendWrongCourseEmail}
    {sendNoCourseEmail}
  />
{/if}
