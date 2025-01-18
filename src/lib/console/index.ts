// Function to display data as a table in the console
export function displayUrlTable(
  data: {
    name: string;
    url: string;
  }[]
) {
  // Determine the maximum length of the name to align columns
  const maxLengthName = data.reduce(
    (max, item) => Math.max(max, item.name.length),
    0
  );

  // Print header
  console.log("Name" + " ".repeat(maxLengthName - "Name".length) + " | URL");
  console.log("-".repeat(maxLengthName + 50)); // Assuming URL won't be longer than 50 characters for simplicity

  // Print each row
  for (const item of data) {
    console.log(
      item.name +
        " ".repeat(maxLengthName - item.name.length) +
        " | " +
        item.url
    );
  }
}
