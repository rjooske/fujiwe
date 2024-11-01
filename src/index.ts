import { parse } from "csv-parse/browser/esm/sync";

function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("assertion failed");
  }
}

function mustGetElementById(id: string): HTMLElement {
  const e = document.getElementById(id);
  assert(e !== null);
  return e;
}

declare const nominalIdentifier: unique symbol;
type Nominal<T, Identifier> = T & { [nominalIdentifier]: Identifier };

type StudentId = Nominal<string, "StudentId">;
type CourseId = Nominal<string, "CourseId">;
type Email = Nominal<string, "Email">;

type StudentContact = { schoolEmail: Email; personalEmail: Email };

type In1 = Map<StudentId, CourseId>;
type In2 = Map<StudentId, true>;
type In3 = Map<StudentId, StudentContact>;

function parseIn1(s: string): In1 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(
        Array.isArray(row) &&
        row.length === 2 &&
        typeof row[0] === "string" &&
        typeof row[1] === "string"
      )
    ) {
      return undefined;
    }
  }

  const in1: In1 = new Map();
  for (const [studentId, courseId] of rows) {
    in1.set(studentId, courseId);
  }
  return in1;
}

function parseIn2(s: string): In2 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(Array.isArray(row) && row.length === 1 && typeof row[0] === "string")
    ) {
      return undefined;
    }
  }

  const in2: In2 = new Map();
  for (const [studentId] of rows) {
    in2.set(studentId, true);
  }
  return in2;
}

function parseIn3(s: string): In3 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(
        Array.isArray(row) &&
        row.length === 3 &&
        typeof row[0] === "string" &&
        typeof row[1] === "string" &&
        typeof row[2] === "string"
      )
    ) {
      return undefined;
    }
  }

  const in3: In3 = new Map();
  for (const [studentId, schoolEmail, personalEmail] of rows) {
    in3.set(studentId, { schoolEmail, personalEmail });
  }
  return in3;
}

type MissingStudent = {
  id: StudentId;
  contact: StudentContact | undefined;
  wrongCourseId: CourseId | undefined;
};
type SuperfluousStudent = {
  id: StudentId;
  contact: StudentContact | undefined;
};
type VerifyResult = {
  missingStudents: MissingStudent[];
  superfluousStudents: SuperfluousStudent[];
};

function verify(
  in1: In1,
  in2: In2,
  in3: In3,
  courseId: CourseId
): VerifyResult {
  const missingStudents: MissingStudent[] = [];
  const superfluousStudents: SuperfluousStudent[] = [];

  for (const studentId of in2.keys()) {
    const actualTakenCourseId = in1.get(studentId);
    if (actualTakenCourseId === undefined) {
      // Student hasn't registered any course
      missingStudents.push({
        id: studentId,
        contact: in3.get(studentId),
        wrongCourseId: undefined,
      });
    } else if (actualTakenCourseId !== courseId) {
      // Student has registered the wrong course
      missingStudents.push({
        id: studentId,
        contact: in3.get(studentId),
        wrongCourseId: actualTakenCourseId,
      });
    }
  }

  for (const [studentId, actualTakenCourseId] of in1.entries()) {
    // Student took the `courseId` course even though they don't have to
    if (actualTakenCourseId === courseId && !in2.has(studentId)) {
      superfluousStudents.push({
        id: studentId,
        contact: in3.get(studentId),
      });
    }
  }

  return {
    missingStudents,
    superfluousStudents,
  };
}

type MailtoUriParams = {
  recipients: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
};

function createMailtoUri(p: MailtoUriParams): string {
  return (
    "mailto:" +
    p.recipients.map(encodeURIComponent).join(",") +
    "?cc=" +
    p.cc.map(encodeURIComponent).join(",") +
    "&bcc=" +
    p.bcc.map(encodeURIComponent).join(",") +
    "&subject=" +
    encodeURIComponent(p.subject) +
    "&body=" +
    encodeURIComponent(p.body)
  );
}
function replaceUnregisteredContent(content: string): string{
  content = content.replaceAll("$1", "未登録");
  return content;
}
function replaceWrongRegisteredContent(content: string, id: CourseId): string{
  content = content.replaceAll("$1", id);
  return content;
}

function displaySuperfluousStudent(
  contact: StudentContact,
  id: StudentId,
  subject: string,
  content: string
): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = `${id} `;
  li.textContent += `学校: ${contact.schoolEmail} 個人: ${contact.personalEmail} `;
  const a = document.createElement("a");
  a.href = createMailtoUri({
    recipients: [contact.schoolEmail],
    cc: [contact.personalEmail],
    bcc: [],
    subject: subject,
    body: content,
  });
  a.textContent = "(メールを作成)";
  li.appendChild(a);
  return li;
}

function displayMissingStudent(
  text: string,
  contact: StudentContact,
  id: StudentId,
  subject: string,
  content: string
): HTMLLIElement {
  const li = document.createElement("li");

  li.textContent = `${id} ${text} 学校: ${contact.schoolEmail} 個人: ${contact.personalEmail} `;
  const a = document.createElement("a");
  a.href = createMailtoUri({
    recipients: [contact.schoolEmail],
    cc: [contact.personalEmail],
    bcc: [],
    subject: subject,
    body: content,
  });
  a.textContent = "(メールを作成)";
  li.appendChild(a);

  return li;
}

function replaceSuperfluousContent(
  content: string,
  courceId: CourseId
): string {
  content = content.replaceAll("$1", courceId);
  return content;
}

function main() {
  const in1Element = mustGetElementById("in1");
  const in2Element = mustGetElementById("in2");
  const in3Element = mustGetElementById("in3");
  const courseIdElement = mustGetElementById("course-id");
  const verifyElement = mustGetElementById("verify");
  const outputElement = mustGetElementById("output");
  const out1Element = mustGetElementById("out1");
  const out2Element = mustGetElementById("out2");
  const content = mustGetElementById("content");
  const subject = mustGetElementById("subject");

  assert(
    in1Element instanceof HTMLTextAreaElement &&
      in2Element instanceof HTMLTextAreaElement &&
      in3Element instanceof HTMLTextAreaElement &&
      courseIdElement instanceof HTMLInputElement &&
      verifyElement instanceof HTMLButtonElement &&
      outputElement instanceof HTMLDivElement &&
      out1Element instanceof HTMLUListElement &&
      out2Element instanceof HTMLUListElement &&
      content instanceof HTMLTextAreaElement &&
      subject instanceof HTMLInputElement
  );

  in1Element.value = `202901213,6501102
202901439,6501102
202901567,6504202
202902148,6501102
202902267,6501102
202902564,6501102
202902759,6504102
202902784,6501102
202902856,6502202
202903012,6501102
202903028,6501102
202903149,6501102
202903181,6501102
202903247,6501102
202903408,6501102
202903432,6501102
202903580,6501202
202903681,6501102
202903762,6501202
202903775,6501102
202903789,6501102
202903823,6502102
202903948,6501102
202904033,6501202
202904058,6501102
202904087,6501202
202904239,6501202
202904293,6501202
202904324,6501102
202904345,6501202
202904452,6501202
202904536,6502102
202904570,6504102
202904637,6502102
202904703,6502102
202904741,6502102
202904765,6502202
202904789,6502102
202904875,6502102
202904912,6502102
202905048,6502102
202905089,6502102
202905117,6502102
202905203,6502102
202905279,6505102
202905322,6502102
202905391,6502102
202905421,6504102
202905506,6502102
202905527,6502102
202905570,6502102
202905652,6505102
202905713,6502102
202905781,6502202
202905819,6502202
202905860,6502202
202905927,6502202
202905945,6504202
202906017,6502202
202906065,6502202
202906089,6502202
202906146,6502202
202906215,6501202
202906283,6502202
202906359,6502202
202906412,6502202
202906459,6502202
202906520,6502202
202906597,6502202
202906615,6502202
202906682,6504102
202906733,6505102
202906823,6504102
202906849,6504102
202906889,6504102
202906935,6502102
202907028,6504102
202907067,6504102
202907156,6504102
202907223,6504102
202907308,6504102
202907327,6504102
202907410,6504202
202907439,6504202
202907481,6501202
202907511,6504202
202907567,6504202
202907632,6504202
202907751,6507102
202907820,6501101
202907865,6504202
202907983,6504202`;
  in2Element.value = `202901213
202901439
202901567
202902148
202902267
202902564
202902759
202902784
202902856
202903012
202903028
202903149
202903181
202903247
202903305
202903408
202903432
202903580
202903681
202903738
202903762
202903775
202903789
202903823
202903948`;
  in3Element.value = `202901213,s2901213@u.tsukuba.ac.jp,john.doe@example.com
202901439,s2901439@u.tsukuba.ac.jp,jane.smith@example.com
202901567,s2901567@u.tsukuba.ac.jp,alice.johnson@example.com
202902148,s2902148@u.tsukuba.ac.jp,bob.brown@example.com
202902267,s2902267@u.tsukuba.ac.jp,charlie.davis@example.com
202902564,s2902564@u.tsukuba.ac.jp,david.miller@example.com
202902759,s2902759@u.tsukuba.ac.jp,eve.white@example.com
202902784,s2902784@u.tsukuba.ac.jp,frank.thompson@example.com
202902856,s2902856@u.tsukuba.ac.jp,grace.jones@example.com
202903012,s2903012@u.tsukuba.ac.jp,hank.wilson@example.com
202903028,s2903028@u.tsukuba.ac.jp,isabella.moore@example.com
202903149,s2903149@u.tsukuba.ac.jp,jack.taylor@example.com
202903181,s2903181@u.tsukuba.ac.jp,karen.anderson@example.com
202903247,s2903247@u.tsukuba.ac.jp,luke.jackson@example.com
202903305,s2903305@u.tsukuba.ac.jp,mary.harris@example.com
202903408,s2903408@u.tsukuba.ac.jp,nathan.martin@example.com
202903432,s2903432@u.tsukuba.ac.jp,olivia.lee@example.com
202903580,s2903580@u.tsukuba.ac.jp,paul.walker@example.com
202903681,s2903681@u.tsukuba.ac.jp,quinn.hall@example.com
202903738,s2903738@u.tsukuba.ac.jp,rachel.allen@example.com
202903762,s2903762@u.tsukuba.ac.jp,sophia.young@example.com
202903775,s2903775@u.tsukuba.ac.jp,tony.king@example.com
202903789,s2903789@u.tsukuba.ac.jp,uma.hill@example.com
202903823,s2903823@u.tsukuba.ac.jp,victor.scott@example.com
202903948,s2903948@u.tsukuba.ac.jp,william.green@example.com
202904033,s2904033@u.tsukuba.ac.jp,xena.adams@example.com
202904058,s2904058@u.tsukuba.ac.jp,yara.baker@example.com
202904087,s2904087@u.tsukuba.ac.jp,zoe.bell@example.com
202904239,s2904239@u.tsukuba.ac.jp,aaron.cooper@example.com
202904272,s2904272@u.tsukuba.ac.jp,brian.foster@example.com
202904293,s2904293@u.tsukuba.ac.jp,cathy.rogers@example.com
202904324,s2904324@u.tsukuba.ac.jp,daniel.perez@example.com
202904345,s2904345@u.tsukuba.ac.jp,elaine.phillips@example.com
202904452,s2904452@u.tsukuba.ac.jp,francis.reed@example.com
202904536,s2904536@u.tsukuba.ac.jp,gina.cox@example.com
202904570,s2904570@u.tsukuba.ac.jp,harry.mitchell@example.com
202904637,s2904637@u.tsukuba.ac.jp,iris.ward@example.com
202904703,s2904703@u.tsukuba.ac.jp,jake.wright@example.com
202904741,s2904741@u.tsukuba.ac.jp,kelly.stewart@example.com
202904765,s2904765@u.tsukuba.ac.jp,luna.foster@example.com
202904789,s2904789@u.tsukuba.ac.jp,mike.wood@example.com
202904875,s2904875@u.tsukuba.ac.jp,nina.brooks@example.com
202904912,s2904912@u.tsukuba.ac.jp,otto.james@example.com
202904933,s2904933@u.tsukuba.ac.jp,penny.carter@example.com
202905048,s2905048@u.tsukuba.ac.jp,quincy.ross@example.com
202905089,s2905089@u.tsukuba.ac.jp,riley.patterson@example.com
202905117,s2905117@u.tsukuba.ac.jp,sandy.james@example.com
202905203,s2905203@u.tsukuba.ac.jp,tony.morris@example.com
202905279,s2905279@u.tsukuba.ac.jp,uma.mitchell@example.com
202905322,s2905322@u.tsukuba.ac.jp,vicky.hughes@example.com
202905391,s2905391@u.tsukuba.ac.jp,walter.burns@example.com
202905421,s2905421@u.tsukuba.ac.jp,xander.perry@example.com
202905506,s2905506@u.tsukuba.ac.jp,yasmine.ramirez@example.com
202905527,s2905527@u.tsukuba.ac.jp,zoey.dixon@example.com
202905570,s2905570@u.tsukuba.ac.jp,adam.gonzalez@example.com
202905652,s2905652@u.tsukuba.ac.jp,brittany.james@example.com
202905713,s2905713@u.tsukuba.ac.jp,cynthia.flores@example.com
202905781,s2905781@u.tsukuba.ac.jp,samantha.quincy@example.com
202905819,s2905819@u.tsukuba.ac.jp,riley.harry@example.com
202905860,s2905860@u.tsukuba.ac.jp,franklin.piper@example.com
202905927,s2905927@u.tsukuba.ac.jp,victor.olivia@example.com
202905945,s2905945@u.tsukuba.ac.jp,francis.carly@example.com
202906017,s2906017@u.tsukuba.ac.jp,wendy.otto@example.com
202906065,s2906065@u.tsukuba.ac.jp,quincy.jake@example.com
202906089,s2906089@u.tsukuba.ac.jp,nora.kelly@example.com
202906146,s2906146@u.tsukuba.ac.jp,william.elaine@example.com
202906197,s2906197@u.tsukuba.ac.jp,elena.riley@example.com
202906215,s2906215@u.tsukuba.ac.jp,victor.hank@example.com
202906283,s2906283@u.tsukuba.ac.jp,rachel.brian@example.com
202906359,s2906359@u.tsukuba.ac.jp,gretchen.nathan@example.com
202906412,s2906412@u.tsukuba.ac.jp,luna.xena@example.com
202906459,s2906459@u.tsukuba.ac.jp,charlie.walter@example.com
202906520,s2906520@u.tsukuba.ac.jp,brian.luna@example.com
202906597,s2906597@u.tsukuba.ac.jp,elizabeth.riley@example.com
202906615,s2906615@u.tsukuba.ac.jp,nathan.quinn@example.com
202906682,s2906682@u.tsukuba.ac.jp,elena.derek@example.com
202906709,s2906709@u.tsukuba.ac.jp,derek.wendy@example.com
202906733,s2906733@u.tsukuba.ac.jp,penny.grace@example.com
202906823,s2906823@u.tsukuba.ac.jp,alice.elaine@example.com
202906849,s2906849@u.tsukuba.ac.jp,otto.jane@example.com
202906889,s2906889@u.tsukuba.ac.jp,adam.tony@example.com
202906935,s2906935@u.tsukuba.ac.jp,nora.quinn@example.com
202907028,s2907028@u.tsukuba.ac.jp,quincy.grace@example.com
202907067,s2907067@u.tsukuba.ac.jp,riley.yasmine@example.com
202907101,s2907101@u.tsukuba.ac.jp,david.luke@example.com
202907156,s2907156@u.tsukuba.ac.jp,tony.matthew@example.com
202907223,s2907223@u.tsukuba.ac.jp,david.harold@example.com
202907308,s2907308@u.tsukuba.ac.jp,bobby.walter@example.com
202907327,s2907327@u.tsukuba.ac.jp,gina.jack@example.com
202907410,s2907410@u.tsukuba.ac.jp,william.nora@example.com
202907439,s2907439@u.tsukuba.ac.jp,victor.mary@example.com
202907481,s2907481@u.tsukuba.ac.jp,walter.jack@example.com
202907511,s2907511@u.tsukuba.ac.jp,charlie.quincy@example.com
202907567,s2907567@u.tsukuba.ac.jp,bobby.daniel@example.com
202907632,s2907632@u.tsukuba.ac.jp,olivia.penny@example.com
202907683,s2907683@u.tsukuba.ac.jp,carly.kurt@example.com
202907751,s2907751@u.tsukuba.ac.jp,bob.bobby@example.com
202907820,s2907820@u.tsukuba.ac.jp,brittany.zoe@example.com
202907865,s2907865@u.tsukuba.ac.jp,jackie.penny@example.com
202907983,s2907983@u.tsukuba.ac.jp,zoe.quinn@example.com`;
  courseIdElement.value = "6501102";

  verifyElement.addEventListener("click", () => {
    const in1 = parseIn1(in1Element.value);
    const in2 = parseIn2(in2Element.value);
    const in3 = parseIn3(in3Element.value);
    const courseId = courseIdElement.value as CourseId;
    assert(in1 !== undefined && in2 !== undefined && in3 !== undefined);
    out1Element.replaceChildren();
    const result = verify(in1, in2, in3, courseId);
    for (const s of result.superfluousStudents) {
      if (s.contact === undefined) {
        //魑魅魍魎 the kyon
      } else {
        out1Element.appendChild(
          displaySuperfluousStudent(
            s.contact,
            s.id,
            subject.value,
            replaceSuperfluousContent(content.value, courseId)
          )
        );
      }
    }
    for (const s of result.missingStudents) {
      if (s.contact === undefined) {
        //魑魅魍魎 the kyon
      } else {
        let text;
        let content1 = content.value;
        if (s.wrongCourseId === undefined) {
          text = "履修未登録 ";
          content1 = replaceUnregisteredContent(content1);
        } else {
          text = `${s.wrongCourseId}を誤登録 `;
          content1 = replaceWrongRegisteredContent(content1, s.wrongCourseId);
        }
        out2Element.appendChild(
          displayMissingStudent(text, s.contact, s.id, subject.value, content1)
        );
      }
      outputElement.classList.add("show");
    }
  });
}

main();
