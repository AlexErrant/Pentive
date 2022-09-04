using System.Net;

namespace Test {
  public class WeatherForecastControllerTests {

    [Fact]
    public async Task GET_retrieves_weather_forecast() {
      await using var application = new ApiWebApplicationFactory();
      using var client = application.CreateClient();

      var response = await client.GetAsync("/weatherforecast");

      Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

  }
}
