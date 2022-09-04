using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Rirhath;

namespace Test {
  // https://timdeschryver.dev/blog/refactor-functional-tests-to-support-minimal-web-apis
  public class ApiWebApplicationFactory : WebApplicationFactory<Program> {
    protected override void ConfigureWebHost(IWebHostBuilder builder) {
      builder.ConfigureAppConfiguration(config => { });
      // highTODO use a different connection string
      builder.ConfigureTestServices(services => {
        services.AddSingleton<IDapperContext, TestDapperContext>();
      });
    }
  }
}
