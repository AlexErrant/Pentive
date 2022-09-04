using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Transactions;
using Microsoft.AspNetCore.WebUtilities;
using Rirhath.Controllers;

namespace Test {
  public class UserControllerTests {

    [Fact]
    public async Task POST_then_GET_retrieves_user() {
      using var transactionScope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled);
      await using var application = new ApiWebApplicationFactory();
      using var client = application.CreateClient();

      var name = Guid.NewGuid().ToString();

      var newUserResponse = await client.PostAsJsonAsync("user", new NewUser {
        Name = name,
      });
      Assert.Equal(HttpStatusCode.OK, newUserResponse.StatusCode);

      var param = new Dictionary<string, string>() { { "name", name } };
      var url = new Uri(QueryHelpers.AddQueryString("http://localhost/user", param));
      var response = await client.GetAsync(url);

      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
      var serializeOptions = new JsonSerializerOptions {
        PropertyNameCaseInsensitive = true
      };
      var u = await response.Content.ReadFromJsonAsync<Padawan>(serializeOptions);
      Assert.Equal(name, u.Name);
      Assert.Equal(Array.Empty<string>(), u.Notifications);
      Assert.Equal("[]", u.Nooks);
      transactionScope.Dispose();
    }

  }
}
