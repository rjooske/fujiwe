<script lang="ts">
  import { browser } from "$app/environment";

  export type EmailTemplate = { subject: string; body: string };

  function formatId(id: string, suffix: string): string {
    return `email-template-input-${id}-${suffix}`;
  }

  let {
    id,
    template = $bindable({ subject: "", body: "" }),
  }: { id: string; template: EmailTemplate } = $props();

  const ids = {
    subject: formatId(id, "subject"),
    body: formatId(id, "body"),
    textareaWidth: formatId(id, "textareaWidth"),
    textareaHeight: formatId(id, "textareaHeight"),
  };

  let textarea = $state<HTMLTextAreaElement | undefined>();
  let textareaInitialWidth = $state("initial");
  let textareaInitialHeight = $state("initial");

  if (browser) {
    template = {
      subject: localStorage.getItem(ids.subject) ?? "",
      body: localStorage.getItem(ids.body) ?? "",
    };
    textareaInitialWidth = localStorage.getItem(ids.textareaWidth) ?? "initial";
    textareaInitialHeight =
      localStorage.getItem(ids.textareaHeight) ?? "initial";

    setInterval(() => {
      if (textarea !== undefined) {
        localStorage.setItem(ids.textareaWidth, textarea.style.width);
        localStorage.setItem(ids.textareaHeight, textarea.style.height);
      }
    }, 1000);
  }
</script>

<label for={ids.subject}>件名:</label>
<input
  type="text"
  id={ids.subject}
  bind:value={template.subject}
  oninput={() => {
    localStorage.setItem(ids.subject, template.subject);
  }}
  style="width: 40em;"
/>
<br />
<label for={ids.body}>本文:</label>
<textarea
  id={ids.body}
  bind:this={textarea}
  bind:value={template.body}
  oninput={() => {
    localStorage.setItem(ids.body, template.body);
  }}
  style="width: {textareaInitialWidth}; height: {textareaInitialHeight}"
></textarea>
