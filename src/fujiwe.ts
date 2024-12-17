declare const nominalIdentifier: unique symbol;
type Nominal<T, Identifier> = T & { [nominalIdentifier]: Identifier };

export type CourseId = Nominal<string, "CourseId">;
export type StudentId = Nominal<string, "StudentId">;
export type Email = Nominal<string, "Email">;

export type Course = {
  id: CourseId;
  name: string;
  expectedStudents: StudentId[];
  targetName: string;
};

export type Student = {
  id: StudentId;
  name: string;
  schoolEmail: Email;
  personalEmail: Email;
};

export type StudentInWrongCourse = Student & {
  registeredCourse: Course;
};

export type StudentInUnknownCourse = Student & {
  unknownCourseId: CourseId;
};

export type RegistrationDiscrepancy = {
  expectedCourse: Course;
  studentsInWrongCourse: StudentInWrongCourse[];
  studentsInNoCourse: Student[];
  studentsInUnknownCourse: StudentInUnknownCourse[];
  studentsWithoutDetails: StudentId[];
};

export function findRegistrationDiscrepancies(
  registeredCourseIds: Map<StudentId, CourseId>,
  students: Map<StudentId, Student>,
  courses: Map<CourseId, Course>,
): RegistrationDiscrepancy[] {
  const discrepancies: RegistrationDiscrepancy[] = [];

  for (const course of courses.values()) {
    const discrepancy: RegistrationDiscrepancy = {
      expectedCourse: course,
      studentsInWrongCourse: [],
      studentsInNoCourse: [],
      studentsInUnknownCourse: [],
      studentsWithoutDetails: [],
    };

    for (const studentId of course.expectedStudents) {
      const student = students.get(studentId);
      if (student === undefined) {
        discrepancy.studentsWithoutDetails.push(studentId);
        continue;
      }

      const registeredCourseId = registeredCourseIds.get(studentId);
      if (registeredCourseId === undefined) {
        // Student hasn't registered any course
        discrepancy.studentsInNoCourse.push(student);
      } else if (registeredCourseId !== course.id) {
        // Student has registered the wrong course
        const registeredCourse = courses.get(registeredCourseId);
        if (registeredCourse === undefined) {
          discrepancy.studentsInUnknownCourse.push({
            ...student,
            unknownCourseId: registeredCourseId,
          });
        } else {
          discrepancy.studentsInWrongCourse.push({
            ...student,
            registeredCourse,
          });
        }
      }
    }

    discrepancies.push(discrepancy);
  }

  return discrepancies;
}
