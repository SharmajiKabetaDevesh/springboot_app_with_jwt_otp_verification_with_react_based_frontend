package com.devesh.spring.otpwithjwtauth.security.services;

import com.devesh.spring.otpwithjwtauth.component.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;
    @Autowired
    private AppProperties appProperties;


    public void sendOtpEmail(String toEmail,String otp){
        try{
            String fromEmail= appProperties.getUsername();
            String pass=appProperties.getPassword();
            System.out.println(fromEmail+" "+pass+" "+toEmail+" "+otp);
            MimeMessage message=mailSender.createMimeMessage();
            MimeMessageHelper helper=new MimeMessageHelper(message,true);
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Your otp code");
            helper.setText("Your OTP code is: " + otp + "\nIt will expire in 5 minutes.",true);
            mailSender.send(message);


        }catch (Exception e){
            System.err.println("Error while sending otp"+e.getMessage());
        }
    }
}
