import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getResumen(@Query('userId') userId: string) {
    console.log(
      '✅ Petición recibida en /dashboard/summary con userId:',
      userId,
    );
    return this.dashboardService.getResumen(userId);
  }
  @Get('ventas')
  getResumeVentas(@Query('userId') userId: string) {
    return this.dashboardService.getDataGraphiscVentas(userId);
  }

  @Get('cobros')
  getResumeCobros(@Query('userId') userId: string) {
    console.log(
      'llega al backend y el usuario en getresumecobros es :',
      userId,
    );
    return this.dashboardService.getDataGraphicsCobros(userId);
  }
}
