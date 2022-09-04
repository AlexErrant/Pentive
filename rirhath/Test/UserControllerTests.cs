using System.Net;

namespace Test {
  public class UserControllerTests {

    [Fact]
    public async Task GET_retrieves_user() {
      await using var application = new ApiWebApplicationFactory();
      using var client = application.CreateClient();

      var response = await client.GetAsync("/user?name=luke");

      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

  }
}
