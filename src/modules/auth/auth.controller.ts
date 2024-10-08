import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import {
  ChangePasswordAuthDto,
  CodeAuthDto,
  CreateAuthDto,
} from './dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Fetch login')
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Public()
  @Post('check-code')
  checkCode(@Body() codeAuthDto: CodeAuthDto) {
    return this.authService.handleCheckCode(codeAuthDto);
  }

  @Public()
  @Post('retry-active')
  retryActive(@Body('email') email: string) {
    return this.authService.handleRetryActive(email);
  }

  @Public()
  @Post('retry-password')
  retryPassword(@Body('email') email: string) {
    return this.authService.handleRetryPassword(email);
  }

  @Public()
  @Post('change-password')
  changePassword(@Body() data: ChangePasswordAuthDto) {
    return this.authService.handleChangePassword(data);
  }

  @Public()
  @Get('mail')
  testMail() {
    this.mailerService.sendMail({
      to: 'bongdem30101998@gmail.com', // list of receivers
      subject: 'Testing Nest MailerModule ✔', // Subject line
      text: 'welcome', // plaintext body
      // html: '<b>welcome</b>', // HTML body content
      template: 'register.hbs',
      context: {
        name: 'phongnt',
        activationCode: 123456,
      },
    });
    return 'vao day';
  }
}
