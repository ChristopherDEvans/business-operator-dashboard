const token = "pk_260611431_RXX3LO0WHMZS83JGWFA8RZQ1JWV7PHFJ";

async function run() {
  try {
    const teamsRes = await fetch("https://api.clickup.com/api/v2/team", { headers: { Authorization: token } });
    const teams = await teamsRes.json();
    if (!teams.teams || teams.teams.length === 0) {
      console.log("No teams found.");
      return;
    }
    const teamId = teams.teams[0].id;
    console.log("Team:", teamId, teams.teams[0].name);

    const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, { headers: { Authorization: token } });
    const spaces = await spacesRes.json();
    if (!spaces.spaces || spaces.spaces.length === 0) {
      console.log("No spaces found.");
      return;
    }
    const spaceId = spaces.spaces[0].id;
    console.log("Space:", spaceId, spaces.spaces[0].name);

    // Try finding folderless lists first
    const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { headers: { Authorization: token } });
    const lists = await listsRes.json();
    
    if (lists.lists && lists.lists.length > 0) {
      const listId = lists.lists[0].id;
      console.log("List:", listId, lists.lists[0].name);
    } else {
      console.log("No folderless lists found. Checking folders...");
      const foldersRes = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, { headers: { Authorization: token } });
      const folders = await foldersRes.json();
      if (folders.folders && folders.folders.length > 0) {
         const folderId = folders.folders[0].id;
         console.log("Folder:", folderId, folders.folders[0].name);
         
         const folderListsRes = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}/list`, { headers: { Authorization: token } });
         const folderLists = await folderListsRes.json();
         if (folderLists.lists && folderLists.lists.length > 0) {
           console.log("List:", folderLists.lists[0].id, folderLists.lists[0].name);
         }
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
